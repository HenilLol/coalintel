# COALINTEL — AI-Powered Evidence-Driven Mining Intelligence & Reporting Platform

> **Problem Statement ID:** SIH26023  
> **Problem Statement Title:** AI-Powered Geological, Mining and other Reporting Solution for CMPDI/CIL subsidiaries  
> **Sponsoring Organization:** Ministry of Coal | Department: Coal India Limited (CIL) / Central Mine Planning & Design Institute (CMPDI)  

---

## 1. Executive Summary
**COALINTEL** is a unified, auditable mining intelligence platform designed to eliminate document fragmentation, manual transcription errors, and prolonged inquiry turnaround times across CIL subsidiaries and CMPDI. It integrates multi-format document ingestion (scanned/digital PDFs, DOCX, XLSX, CSV), deterministic metric extraction and unit normalization, automated cross-document conflict detection, cited hybrid RAG Q&A search, and template-driven official report assembly.

---

## 2. Architecture & Technology Stack
COALINTEL is engineered as a containerized **Modular Monolith**:

* **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
* **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, PyMuPDF, Tesseract OCR
* **Database:** PostgreSQL 15 (Relational Store + Full-Text BM25 Search)
* **Vector Store & RAG:** ChromaDB (`all-MiniLM-L6-v2`, 384d), Reciprocal Rank Fusion (RRF $k=60$)
* **Reporting:** ReportLab PDF compilation engine
* **Containerization:** Docker Compose (`frontend`, `backend`, `postgres`)

---

## 3. Directory Layout
```text
COALINTEL/
├── Documents/                           # Frozen Engineering Specification (SSOT)
│   ├── COALINTEL_MASTER_SPECIFICATION.md
│   ├── TRD.md
│   ├── PRD.md
│   ├── UI_UX_DOCUMENTATION.md
│   ├── BACKEND_DOCUMENTATION.md
│   ├── SECURITY_DOCUMENTATION.md
│   ├── USER_FLOW_DOCUMENTATION.md
│   ├── extracted_doc_text.txt
│   ├── COALINTEL_DOCUMENTATION_CROSS_CHECK_REPORT.md
│   ├── COALINTEL_FINAL_DOCUMENTATION_FREEZE_AUDIT.md
│   └── COALINTEL_IMPLEMENTATION_MASTER_PLAN.md
├── backend/                             # FastAPI Python 3.11 Application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   └── app/
│       ├── api/
│       ├── core/
│       ├── models/
│       ├── schemas/
│       └── services/
│           └── llm_provider.py          # LLM Provider Abstraction & Degraded Fallback
├── frontend/                            # React 18 + Vite SPA Application
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
├── storage/                             # Persistent Volume Storage Mounts
│   ├── uploads/
│   ├── reports/
│   └── chroma_db/
├── docker-compose.yml                   # Docker Multi-Container Orchestration
├── .env.example                         # Environment Variables Template
├── .gitignore                           # Repository Ignore Rules
└── README.md                            # System Guide
```

---

## 4. Quick Start & Local Execution

### Prerequisites
* Docker & Docker Compose
* Python 3.11+ (for local host backend running)
* Node.js 18+ (for local host frontend running)

### Running with Docker Compose
```bash
# 1. Clone repository & copy environment configuration
cp .env.example .env

# 2. Build and launch all services
docker-compose up --build -d

# 3. Access Services:
# - Frontend SPA: http://localhost:3000
# - Backend API: http://localhost:8000
# - Interactive API Docs: http://localhost:8000/api/v1/docs
```

---

## 5. Production Deployment Checklist

Before exposing COALINTEL to any real deployment (including SIH final evaluation environments), complete every item:

- [ ] **SECRET_KEY** — set a strong random value (32+ chars). Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The backend **refuses to start in production** with the placeholder value.
- [ ] **ENVIRONMENT=production** — also disables the automatic CORS dev-origin append in `main.py`.
- [ ] **POSTGRES_PASSWORD** — change from the default; never expose port 5432 outside the compose network.
- [ ] **Bootstrap credentials** — set `BOOTSTRAP_ADMIN_PASSWORD` (and other `BOOTSTRAP_<ROLE>_PASSWORD` vars) before first boot. Without them, random passwords are generated and **printed once in the startup logs** — retrieve them from the logs and change them immediately.
- [ ] **ALLOWED_ORIGINS / FRONTEND_URL** — set to the real frontend origin only.
- [ ] **HTTPS** — terminate TLS at the proxy; mark cookies `Secure`.
- [ ] **Auth rate limiting** — active by default (5 failed attempts per username+IP per 15 min → 15 min lockout). For multi-worker deployments, front the API with a reverse-proxy limiter (e.g. nginx `limit_req`) since the built-in limiter is per-process.
- [ ] **Supabase keys** — service-role key stays backend-only (never `NEXT_PUBLIC_*`/`VITE_*` prefixed).
- [ ] **Monitoring** — watch the `/health` endpoint plus LOGIN_FAILED audit-log spikes (brute-force indicator).

### Database migrations (Alembic)

Schema changes are managed with Alembic (Issue #63). The two legacy SQL scripts in `backend/migrations/` are preserved as the source of truth for behavior, but all future changes go through Alembic revisions:

```bash
# Existing deployment with tables already created (created via create_all or legacy SQL):
cd backend
alembic stamp baseline_create_all     # mark current state, no DDL
alembic upgrade head                  # apply any pending column migrations

# New column change workflow:
alembic revision -m "describe change" --autogenerate   # generate from ORM models
# review the generated file in backend/alembic/versions/, then:
alembic upgrade head
```

Startup continues to run `create_all` for fresh dev/test bootstrap; production should run `alembic upgrade head` as the deploy step.

---

## 6. Development Roadmap
* **Day 0:** Project Foundation & Environment Configuration (COMPLETE)
* **Day 1:** System Foundation & Database Schemas (DDL & ORM)
* **Day 2:** Frontend React Shell & Layout Component Sprint
* **Day 3:** Backend Ingestion & File Management APIs
* **Day 4:** Document Extraction & OCR Pipeline
* **Day 5:** Hybrid Vector Search Engine & Cited RAG Assistant
* **Day 6:** Validation Engine, Conflict Resolver & Report Engine
* **Day 7:** Full-Stack End-to-End Integration
* **Day 8:** Golden Dataset Testing & Pitch Hardening
