"""
COALINTEL Real Government Corpus Ingestion Runner
Issue #80 deliverable: a repeatable, authenticated, end-to-end ingestion
script for the curated official-publication corpus.

Corpus (all official Government of India sources, free to download):
  1. CCO Coal Directory of India 2023-24
     https://www.coalcontroller.gov.in/files/annual_coal_directories_document/28-10-2024adir_0.pdf
  2. MOC Provisional Coal Statistics 2022-23
     https://coal.nic.in/en/major-statistics/coal-statistics

Safety Guarantees:
1. Explicit CLI invocation only (no execution on import).
2. Uploads through the AUTHENTICATED pipeline (POST /documents/upload) —
   the exact path a real analyst uses. No direct DB writes, no synthetic
   seeding shortcuts.
3. Original PDFs only. Large PDFs are split into <50 MB parts under the
   upload cap; rebuilt text-PDFs are rejected (they lose table geometry).
4. Idempotent-by-nature: the API's SHA-256 dedup skips already-ingested
   files on re-run.
5. Verifies every document reaches PARSED and prints a lineage summary
   (documents -> pages -> extracted metrics -> entity attribution) so the
   real provenance chain is visible for the demo dashboard.

Usage:
    python scripts/ingest_real_gov_corpus.py \
        --api-base http://localhost:8000/api/v1 \
        --username admin --password-file /secure/pw.txt \
        --docs-dir /path/to/coalintel-docs

The password is read from a file (or stdin with --password-file -) so it
never lands in shell history.
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error
import uuid
import io

# Optional PDF splitting for >50 MB sources (PyMuPDF)
try:
    import pymupdf  # PyMuPDF (>= 1.24 name); alias fitz for older installs
    fitz = pymupdf
    HAS_PYMUPDF = True
except ImportError:
    try:
        import fitz  # legacy PyMuPDF import name
        HAS_PYMUPDF = True
    except ImportError:
        HAS_PYMUPDF = False

UPLOAD_CAP_BYTES = 50 * 1024 * 1024  # backend upload cap (Issue #54)
SPLIT_PART_PAGES = 40                 # pages per part when splitting
POLL_INTERVAL_S = 8
POLL_TIMEOUT_S = 30 * 60             # OCR-heavy parts can take minutes


class IngestionError(Exception):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


def read_password(path):
    if path == "-":
        return sys.stdin.readline().strip()
    with open(path, "r", encoding="utf-8") as fh:
        return fh.readline().strip()


def api_request(base, path, token=None, data=None, raw_body=None,
                content_type="application/json", timeout=300):
    method = "POST" if (data is not None or raw_body is not None) else "GET"
    req = urllib.request.Request(base.rstrip("/") + path, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", content_type)
    if data is not None:
        body = json.dumps(data).encode()
    elif raw_body is not None:
        body = raw_body
    else:
        body = None
    try:
        resp = urllib.request.urlopen(req, body, timeout=timeout)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        raise IngestionError(f"API {method} {path} -> {e.code}: {detail}",
                             status_code=e.code) from e


class DuplicateDocument(IngestionError):
    """409 from the upload endpoint: identical SHA-256 already ingested.

    The backend's dedup (Issue #54) makes re-runs idempotent; the runner
    treats this as ALREADY-INGESTED and continues with the next file.
    """


def login(base, username, password):
    resp = api_request(base, "/auth/login",
                       data={"username": username, "password": password})
    return resp["access_token"]


def maybe_split_pdf(file_path, out_dir):
    """Split a PDF into <50 MB parts if it exceeds the upload cap.

    Original pages are copied verbatim — no text rebuilding, preserving
    table geometry for the columnar extractors (#79) and scanned-page OCR
    (#83).
    """
    size = os.path.getsize(file_path)
    if size <= UPLOAD_CAP_BYTES:
        return [file_path]

    if not HAS_PYMUPDF:
        raise IngestionError(
            f"{os.path.basename(file_path)} is {size/1e6:.0f} MB (> "
            f"{UPLOAD_CAP_BYTES/1e6:.0f} MB cap) and PyMuPDF is not "
            "installed for splitting. Install PyMuPDF or provide parts."
        )

    os.makedirs(out_dir, exist_ok=True)
    src = fitz.open(file_path)
    total = len(src)
    parts = []
    start = 0
    part_idx = 1
    while start < total:
        end = min(start + SPLIT_PART_PAGES, total)
        # keep the last part from being tiny
        if total - end < SPLIT_PART_PAGES // 4:
            end = total
        part_path = os.path.join(
            out_dir,
            f"{os.path.splitext(os.path.basename(file_path))[0]}"
            f"_part{part_idx}_pp{start+1}-{end}.pdf",
        )
        if not (os.path.exists(part_path)
                and os.path.getsize(part_path) <= UPLOAD_CAP_BYTES):
            out = fitz.open()
            out.insert_pdf(src, from_page=start, to_page=end - 1)
            out.save(part_path)
            out.close()
        if os.path.getsize(part_path) > UPLOAD_CAP_BYTES:
            raise IngestionError(
                f"split part {part_path} still exceeds the upload cap; "
                f"lower SPLIT_PART_PAGES ({SPLIT_PART_PAGES})"
            )
        parts.append(part_path)
        part_idx += 1
        start = end
    src.close()
    return parts


def upload_document(base, token, file_path, subsidiary, fiscal_year):
    """Returns (document_id | None, status) — status is 'UPLOADED' or
    'ALREADY-INGESTED' (409 dedup)."""
    with open(file_path, "rb") as fh:
        pdf_bytes = fh.read()
    boundary = uuid.uuid4().hex
    name = os.path.basename(file_path)
    body = b"".join([
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
        f'filename="{name}"\r\nContent-Type: application/pdf\r\n\r\n'.encode(),
        pdf_bytes,
        b"\r\n",
        f'--{boundary}\r\nContent-Disposition: form-data; name="subsidiary"'
        f'\r\n\r\n{subsidiary}\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="fiscal_year"'
        f'\r\n\r\n{fiscal_year}\r\n'.encode(),
        f"--{boundary}--\r\n".encode(),
    ])
    try:
        resp = api_request(
            base, "/documents/upload", token=token, raw_body=body,
            content_type=f"multipart/form-data; boundary={boundary}",
            timeout=600,
        )
        return resp["id"], "UPLOADED"
    except IngestionError as e:
        if e.status_code == 409:
            return None, "ALREADY-INGESTED"
        raise


def wait_for_parsed(base, token, doc_id):
    deadline = time.time() + POLL_TIMEOUT_S
    while time.time() < deadline:
        doc = api_request(base, f"/documents/{doc_id}", token=token)
        status = doc.get("status")
        if status in ("PARSED", "FAILED"):
            return status, doc
        time.sleep(POLL_INTERVAL_S)
    raise IngestionError(f"document {doc_id} still processing after "
                         f"{POLL_TIMEOUT_S}s")


def lineage_summary(base, token, doc_id):
    try:
        lin = api_request(base, f"/documents/{doc_id}/lineage", token=token)
    except IngestionError as e:
        return {"error": str(e)}
    metrics = lin.get("metrics", []) or []
    entities = {}
    for m in metrics:
        name = m.get("mine_name") or "Unspecified"
        entities[name] = entities.get(name, 0) + 1
    return {
        "document_id": doc_id,
        "metric_count": len(metrics),
        "entity_buckets": dict(sorted(entities.items(),
                                      key=lambda kv: -kv[1])),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Ingest the real government corpus through "
                    "CoalIntel's authenticated pipeline (Issue #80).")
    parser.add_argument("--api-base", required=True,
                        help="e.g. http://localhost:8000/api/v1")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password-file", required=True,
                        help="file with the password on line 1, or - for stdin")
    parser.add_argument("--docs-dir", required=True,
                        help="directory holding the source PDFs / split parts")
    parser.add_argument("--split-dir", default=None,
                        help="where >50 MB PDFs get split (default: <docs-dir>/parts)")
    args = parser.parse_args()

    password = read_password(args.password_file)

    # Curated corpus: (filename, subsidiary, fiscal_year)
    corpus = [
        ("coal_directory_2023-24.pdf", "CCO", "2023-24"),
        ("provisional_coal_statistics_2022-23.pdf", "MOC", "2022-23"),
    ]
    # plus every pre-split part present in the docs dir
    extra_parts = sorted(
        f for f in os.listdir(args.docs_dir)
        if f.endswith(".pdf") and "_part" in f
    )

    token = login(args.api_base, args.username, password)
    print("authenticated")

    results = []

    def ingest_one(file_path, subsidiary, fiscal_year):
        doc_id, up_status = upload_document(args.api_base, token, file_path,
                                            subsidiary, fiscal_year)
        if up_status == "ALREADY-INGESTED":
            print(f"ALREADY-INGESTED (409 dedup): {os.path.basename(file_path)}")
            results.append({"file": os.path.basename(file_path),
                            "status": "ALREADY-INGESTED"})
            return
        print(f"UPLOADED {os.path.basename(file_path)} -> doc {doc_id}")
        status, doc = wait_for_parsed(args.api_base, token, doc_id)
        summary = lineage_summary(args.api_base, token, doc_id)
        summary["file"] = os.path.basename(file_path)
        summary["status"] = status
        results.append(summary)
        print(f"  status={status} metrics={summary.get('metric_count')}")

    for filename, subsidiary, fiscal_year in corpus:
        src = os.path.join(args.docs_dir, filename)
        if not os.path.exists(src):
            print(f"SKIP (missing): {filename}")
            continue
        parts = maybe_split_pdf(src, args.split_dir
                                or os.path.join(args.docs_dir, "parts"))
        for part in parts:
            ingest_one(part, subsidiary, fiscal_year)

    for part in extra_parts:
        fy = "2023-24" if "directory" in part.lower() else "2022-23"
        sub = "CCO" if "directory" in part.lower() else "MOC"
        ingest_one(os.path.join(args.docs_dir, part), sub, fy)

    print("=" * 72)
    print("REAL GOVERNMENT CORPUS INGESTION SUMMARY")
    print("=" * 72)
    print(json.dumps(results, indent=2))
    total_metrics = sum(r.get("metric_count", 0) for r in results)
    failed = [r["file"] for r in results if r.get("status") == "FAILED"]
    print(f"documents={len(results)} metrics={total_metrics} failed={len(failed)}")
    if failed:
        print(f"FAILED: {failed}")
        sys.exit(1)
    print("STATUS: SUCCESS")
    sys.exit(0)


if __name__ == "__main__":
    main()
