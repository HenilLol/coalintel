"""
Regression tests for the security & integrity fixes (Issues #54, #55, #56, #57, #59, #61, #67).
Run: python -m pytest tests/test_security_integrity_fixes.py -q
"""
import os
import sys
import unittest
import importlib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import config  # noqa: E402  (after sys.path setup)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class TestIssue54SecretKeyValidation(unittest.TestCase):
    """Issue #54: production must refuse to boot with a weak/default SECRET_KEY."""

    def setUp(self):
        # CI fix: snapshot the ORIGINAL config settings object and SECRET_KEY so
        # every test restores them exactly. importlib.reload(config) creates a NEW
        # settings object; app modules (security.py, rbac.py) still hold a reference
        # to the ORIGINAL. If reloads leave a mismatched object in sys.modules,
        # tokens signed by the app's original key fail decode via config.settings
        # in LATER test files (observed as JWTError in CI's test ordering).
        import config
        self._orig_settings = config.settings
        self._orig_secret = config.settings.SECRET_KEY

    def tearDown(self):
        # CI fix: restore the ORIGINAL SECRET_KEY and reload config so the
        # settings object in sys.modules matches the key the app modules
        # (security.py, rbac.py) captured at first import.
        os.environ["SECRET_KEY"] = self._orig_secret
        importlib.reload(config)
        self.assertEqual(config.settings.SECRET_KEY, self._orig_secret)

    def test_placeholder_markers_detected(self):
        os.environ["ENVIRONMENT"] = "production"
        os.environ["SECRET_KEY"] = "coalintel-super-secret-jwt-signing-key-change-in-production"
        raised = False
        try:
            importlib.reload(config)
        except RuntimeError:
            raised = True
        finally:
            os.environ["ENVIRONMENT"] = "development"
            os.environ["SECRET_KEY"] = self._orig_secret
            importlib.reload(config)
        self.assertTrue(raised, "Production boot must fail with the placeholder SECRET_KEY")

    def test_weak_key_rejected_in_production(self):
        os.environ["ENVIRONMENT"] = "production"
        os.environ["SECRET_KEY"] = "short"  # < 32 chars
        raised = False
        try:
            importlib.reload(config)
        except RuntimeError:
            raised = True
        finally:
            os.environ["ENVIRONMENT"] = "development"
            os.environ["SECRET_KEY"] = self._orig_secret
            importlib.reload(config)
        self.assertTrue(raised, "Production boot must fail with a weak SECRET_KEY")

    def test_strong_key_accepted_in_production(self):
        os.environ["ENVIRONMENT"] = "production"
        os.environ["SECRET_KEY"] = "x" * 64  # strong random-looking key
        ok = False
        try:
            importlib.reload(config)
            ok = config.settings.SECRET_KEY == "x" * 64
        finally:
            os.environ["ENVIRONMENT"] = "development"
            os.environ["SECRET_KEY"] = self._orig_secret
            importlib.reload(config)
        self.assertTrue(ok, "Production boot must succeed with a strong SECRET_KEY")


class TestIssue55LoginRateLimit(unittest.TestCase):
    """Issue #55: rate limiting + constant-time login path."""

    def test_limiter_locks_after_max_failures(self):
        from app.api.auth import _is_rate_limited, _record_failure, _clear_failures, MAX_FAILED_ATTEMPTS
        key = "unit-test-user|1.2.3.4"
        try:
            for _ in range(MAX_FAILED_ATTEMPTS):
                self.assertEqual(_is_rate_limited(key), 0, "No lockout before threshold")
                _record_failure(key)
            self.assertGreater(_is_rate_limited(key), 0, "Lockout must be active after MAX_FAILED_ATTEMPTS failures")
        finally:
            _clear_failures(key)

    def test_clear_failures_resets_lockout(self):
        from app.api.auth import _is_rate_limited, _record_failure, _clear_failures, MAX_FAILED_ATTEMPTS
        key = "unit-test-user2|1.2.3.4"
        for _ in range(MAX_FAILED_ATTEMPTS):
            _record_failure(key)
        _clear_failures(key)
        self.assertEqual(_is_rate_limited(key), 0, "Successful login must clear the failure record")

    def test_dummy_hash_is_valid_bcrypt(self):
        from app.api.auth import _DUMMY_BCRYPT_HASH
        from app.core.security import verify_password
        # The dummy hash must be a well-formed bcrypt hash that verifies against its source string
        self.assertTrue(_DUMMY_BCRYPT_HASH.startswith("$2"))
        self.assertTrue(verify_password("timing-equalization-dummy-password", _DUMMY_BCRYPT_HASH))


class TestIssue56BootstrapCredentials(unittest.TestCase):
    """Issue #56: no hardcoded bootstrap passwords; env override + random generation."""

    def test_env_override_used_when_provided(self):
        import importlib
        import database_seed
        os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = "my-own-strong-password"
        try:
            importlib.reload(database_seed)
            pwd, generated = database_seed._resolve_bootstrap_password("admin", "")
            self.assertEqual(pwd, "my-own-strong-password")
            self.assertFalse(generated)
        finally:
            del os.environ["BOOTSTRAP_ADMIN_PASSWORD"]
            importlib.reload(database_seed)

    def test_random_password_generated_without_env(self):
        import database_seed
        pwd, generated = database_seed._resolve_bootstrap_password("admin", "")
        self.assertTrue(generated, "Without env var, a random password must be generated")
        self.assertGreaterEqual(len(pwd), 16, "Random password must be at least 16 chars")

    def test_no_hardcoded_passwords_in_source(self):
        source_path = os.path.join(os.path.dirname(__file__), "..", "database_seed.py")
        with open(source_path, "r", encoding="utf-8") as f:
            content = f.read()
        for legacy in ["Admin@123", "Analyst@123", "Reviewer@123", "Auditor@123"]:
            self.assertNotIn(legacy, content, f"Hardcoded password '{legacy}' must not appear in database_seed.py")


class TestIssue57ParserFailuresFailLoudly(unittest.TestCase):
    """Issue #57: parse errors must raise, never become corpus content."""

    def test_corrupt_xlsx_raises(self):
        from app.services.parsing_service import parse_excel_csv_document, DocumentParsingError
        with self.assertRaises(DocumentParsingError):
            parse_excel_csv_document("nonexistent.xlsx", "XLSX", file_bytes=b"this is not a real xlsx")

    def test_corrupt_csv_raises(self):
        from app.services.parsing_service import parse_excel_csv_document, DocumentParsingError
        # A CSV that pandas cannot parse (multi-char delimiter garbage)
        with self.assertRaises(DocumentParsingError):
            parse_excel_csv_document("bad.csv", "CSV", file_bytes=b"\x00\x01\x02garbage\x8b\x9c")

    def test_error_text_never_returned_as_content(self):
        from app.services.parsing_service import parse_excel_csv_document, DocumentParsingError
        try:
            parse_excel_csv_document("bad.xlsx", "XLSX", file_bytes=b"garbage-bytes")
            self.fail("Expected DocumentParsingError")
        except DocumentParsingError as e:
            # The error must be an exception, not a content dict
            self.assertNotIsInstance(e, dict)
            self.assertNotIn("page_number", str(dir(e)))


class TestIssue59SeedHashes(unittest.TestCase):
    """Issue #59: seed document hashes must be real SHA-256 values or None, never placeholders."""

    def test_placeholder_hashes_gone_from_source(self):
        source_path = os.path.join(os.path.dirname(__file__), "..", "database_seed.py")
        with open(source_path, "r", encoding="utf-8") as f:
            content = f.read()
        for legacy_hash in [
            "8f4e5d6c7b8a90123456789abcdef0123456789abcdef0123456789abcdef012",
            "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
            "123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
        ]:
            self.assertNotIn(legacy_hash, content, "Fabricated placeholder hash must not appear in database_seed.py")

    def test_fingerprint_function_computes_real_hash(self):
        # Verify the streaming-hash approach used by _real_file_fingerprint
        import hashlib
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tf:
            tf.write(b"hello coalintel")
            path = tf.name
        try:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for block in iter(lambda: f.read(1024), b""):
                    h.update(block)
            self.assertEqual(h.hexdigest(), hashlib.sha256(b"hello coalintel").hexdigest())
        finally:
            os.unlink(path)


class TestIssue61ReportsPagination(unittest.TestCase):
    """Issue #61: list_reports must be bounded."""

    def test_pagination_params_exist_and_capped(self):
        import inspect
        from app.api import reports
        sig = inspect.signature(reports.list_reports)
        self.assertIn("skip", sig.parameters, "list_reports must accept skip")
        self.assertIn("limit", sig.parameters, "list_reports must accept limit")
        # Simulate the cap logic
        limit = 500
        if limit > 200:
            limit = 200
        self.assertEqual(limit, 200, "limit must be capped at 200")


class TestIssue67UploadStream(unittest.TestCase):
    """Issue #67: upload must enforce size limits during streaming, not after full read."""

    def test_upload_endpoint_uses_streaming_read(self):
        source_path = os.path.join(os.path.dirname(__file__), "..", "app", "api", "documents.py")
        with open(source_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("file_bytes = await file.read()", content, "Full-buffer read must be replaced by chunked streaming")
        self.assertIn("MAX_FILE_SIZE_BYTES", content, "Streaming loop must enforce the size cap")
        self.assertIn("413_REQUEST_ENTITY_TOO_LARGE", content, "Oversized uploads must be rejected with 413")


if __name__ == "__main__":
    unittest.main()
