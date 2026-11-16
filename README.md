# MedCore AI: Enterprise Healthcare Analytics & Hospital Management System (HMS)

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis_RQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![ChromaDB](https://img.shields.io/badge/Chroma_Vector_Store-FF6B6B?style=for-the-badge)](https://www.trychroma.com)
[![PyTorch](https://img.shields.io/badge/PyTorch_Embeddings-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)

**MedCore AI** is a production-grade, full-stack Hospital Management System (HMS) and Clinical Decision Support Platform. The platform couples modular healthcare operations (Appointments, Inpatient Care, ICU/ER, Operating Theatres, Labs, Pharmacy, Housekeeping, Canteen, Billing) with cutting-edge Artificial Intelligence: **Retrieval-Augmented Generation (RAG) with real-time HTTP SSE progress streaming**, **OCR report processing**, **Machine Learning patient risk prediction**, and **unsupervised patient clustering**.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Features & Hospital Portals](#key-features--hospital-portals)
- [AI & Machine Learning Engine](#ai--machine-learning-engine)
  - [Real-Time HTTP Streaming RAG Indexing](#real-time-http-streaming-rag-indexing)
  - [Clinical AI Assistant & Medical Grounding](#clinical-ai-assistant--medical-grounding)
  - [Predictive Risk Classification & Clustering](#predictive-risk-classification--clustering)
  - [Automated Medical OCR](#automated-medical-ocr)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started & Installation](#getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Redis & Background RQ Worker](#4-redis--background-rq-worker)
  - [5. Frontend Setup](#5-frontend-setup)
- [API Documentation & Endpoints](#api-documentation--endpoints)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Clinical Disclaimer](#clinical-disclaimer)
- [Author & License](#author--license)

---

## System Architecture

```mermaid
graph TB
    subgraph Client Layer [Modern React 18 + TypeScript Client]
        UI[Liquid-Glass Clinical UI]
        AdminP[Admin Command Portal]
        DocP[Doctor Clinical Station]
        NurseP[Nursing & Ward Station]
        LabP[Diagnostics & Pathology]
        PharmP[Pharmacy & Dispensing]
        RecepP[Front Desk & Billing]
        WorkerP[Operations & Housekeeping]
        CantP[Dietary & Canteen]
        PatientP[Patient EMR & Portal]
    end

    subgraph API Gateway [FastAPI Asynchronous Gateway]
        Auth[JWT & RBAC Security Layer]
        Router[Modular REST Endpoints]
        SSEService[SSE HTTP Streaming Server]
    end

    subgraph AI & Compute Engine [Clinical Intelligence]
        LLM[Dual LLM Engine: Groq OSS & Gemini]
        OCR[Tesseract Diagnostic OCR Engine]
        ML[Scikit-Learn Risk Predictor]
        Cluster[K-Means / DBSCAN / Hierarchical Engine]
    end

    subgraph Data & Queue Layer [Enterprise Storage & Message Broker]
        Postgres[(PostgreSQL Relational DB)]
        Redis[(Redis Message Broker)]
        Worker[RQ Background Worker]
        VectorStore[(Chroma / FAISS Vector DB)]
        Guidelines[(Medical Knowledge Store)]
    end

    UI --> Auth
    Auth --> Router
    Router --> Postgres
    Router --> SSEService
    Router --> Redis
    Redis --> Worker
    Worker --> Guidelines
    Worker --> VectorStore
    Worker --> Redis
    Redis --> SSEService
    SSEService -. Real-Time Stream (0-100%) .-> UI
    Router --> LLM
    Router --> OCR
    Router --> ML
    Router --> Cluster
```

---

## Key Features & Hospital Portals

MedCore AI provides tailored clinical workflows across 10 specialized portals:

1. **Hospital Administration & Command Center**
   - Live hospital census, departmental breakdown (ER, ICU, OT, Housekeeping), occupancy ratios, and financial KPIs.
   - Staff governance, role delegation, and user access provisioning.
   - Clinical Knowledge Base RAG document management & automated background synchronization.
   - ML model performance tracking, evaluation metrics, and retraining controls.
   - System diagnostics and real-time PostgreSQL database health checks.

2. **Doctor Clinical Workspace**
   - Active appointment queues, clinical consultations, and ICD-10 diagnostic entries.
   - Comprehensive Electronic Health Records (EHR), vitals timeline, and historical medical reports.
   - Digital prescription generation with structured medication schedules.
   - Laboratory test ordering and real-time pathology result tracking.
   - Critical Care tracking across Emergency, Intensive Care, and Operating Theatres.
   - On-Call meal ordering directly to the hospital dietary kitchen.

3. **Nursing & Critical Care Portal**
   - Shift-by-shift patient vital logging (Blood Pressure, Glucose, Heart Rate, SpO2, Temperature).
   - Inpatient bed management, triage status updates, and nurse handover notes.

4. **Diagnostics & Pathology Laboratory**
   - Diagnostic test order queue with sample collection tracking.
   - Standardized lab result entry with reference ranges, unit definitions, and automated flag tags (`normal`, `abnormal`, `critical`).
   - Printable diagnostic pathology reports for patients and physicians.

5. **Hospital Pharmacy & Dispensary**
   - Live prescription fulfillment queue connected to doctors' consultations.
   - Medicine inventory stock monitoring with low-stock alerts, expiry tracking, and batch controls.
   - Instant medication dispensing with billing integration.

6. **Front Desk, Intake & Billing (Reception)**
   - Walk-in patient intake, quick registration, and appointment booking.
   - Comprehensive billing management: invoice generation, payment receipt collection, and itemized service invoicing.

7. **Operations & Housekeeping (Support Workers)**
   - Ward sanitation, bed turnaround tracking, biohazard waste disposal, and maintenance checklists.
   - Duty assignments and shift completion status.

8. **Dietary & Hospital Canteen**
   - Kitchen order fulfillment queue for patients, physicians, and clinical staff.
   - Therapeutic dietary catalog management (Diabetic-safe, Low-Sodium, Renal-care, High-Protein).

9. **Patient EMR & Telehealth Portal**
   - Secure patient access to personal medical records, active prescriptions, and lab test reports.
   - Home vitals self-monitoring and appointment scheduling with designated doctors.
   - Dietary meal ordering to patient recovery rooms.

10. **Public Booking & Hospital Directory**
    - Public doctor search by department and specialization.
    - Online OPD appointment reservation and instant booking confirmations.

---

## AI & Machine Learning Engine

### Real-Time HTTP Streaming RAG Indexing
When medical reference documents (PDF, DOCX, TXT, OCR-scanned images) are uploaded to expand the hospital's clinical knowledge:
- The backend accepts the upload and queues an asynchronous vectorization job in **Redis & RQ Worker**.
- The client connects immediately to the **Server-Sent Events (SSE)** endpoint:
  ```http
  GET /api/v1/assistant/knowledge/jobs/{job_id}/stream
  ```
- **Live Visual Stepper & Progress Tracker**:
  - `1% - 8%`: Document parsing, image extraction, and OCR scan.
  - `8% - 25%`: Semantic boundary-aware text chunking.
  - `25% - 90%`: High-dimensional vector embedding computation via `sentence-transformers/all-MiniLM-L6-v2`.
  - `90% - 98%`: Vector database indexing and HNSW graph construction.
  - `100%`: Finalization and instantaneous availability for clinical decision support.
- Features a liquid-glass gradient progress bar with active shimmer animation, live numerical percentage readouts, and streamed worker terminal log lines.

### Clinical AI Assistant & Medical Grounding
- **Dual-Engine LLM**: Powered by **Groq OpenAI OSS** (Llama 3 / Mixtral) with automated fallback to **Google Gemini 3.7 Flash**.
- **Context Grounding**: Every prompt is dynamically grounded with:
  1. Semantic chunks retrieved from verified hospital knowledge and WHO clinical guidelines.
  2. Patient-specific EHR vitals, lab reports, and medication histories.
- Formatted markdown output with citation tags, clinical cautions, and dosage recommendations.

### Predictive Risk Classification & Clustering
- **Supervised Risk Classification**: Trained Random Forest & Logistic Regression classifiers assess patient vitals (Glucose, Systolic BP, BMI, Cholesterol, Heart Rate) to determine cardiovascular and metabolic risk tiers (`Low`, `Medium`, `High`, `Critical`).
- **Unsupervised Population Clustering**: K-Means, DBSCAN, and Agglomerative Hierarchical clustering segment patient populations into actionable risk clusters for public health intervention.

### Automated Medical OCR
- Integrated **Tesseract OCR** parses uploaded medical reports (PDF, JPG, PNG, TIFF), extracting lab values, clinical observations, and discharge summaries directly into the patient's record.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite 6 |
| **Styling & Design** | Tailwind CSS 3, Lucide Icons, Liquid-Glass Clinical Design System |
| **Data Fetching** | TanStack React Query v5, Axios |
| **Charts & Analytics** | Recharts Data Visualization |
| **Backend Framework** | FastAPI (Python 3.11+), Pydantic v2, Starlette |
| **Relational Database** | PostgreSQL 14+, SQLAlchemy ORM |
| **Task Queue & Cache** | Redis 7, RQ (Redis Queue), SimpleWorker |
| **Vector Search & RAG** | ChromaDB, PyTorch, Sentence-Transformers |
| **LLM Inference** | Groq Cloud SDK, Google Generative AI (Gemini) |
| **Machine Learning** | Scikit-Learn, NumPy, Pandas, Joblib |
| **OCR Engine** | Tesseract OCR, PyTesseract, Pillow, PDF2Image |

---

## Project Directory Structure

```text
healthcare_ai/
├── app/                              # Backend application package
│   ├── config.py                     # Central configuration & env parsing
│   ├── database.py                   # SQLAlchemy engine & session factory
│   ├── models.py                     # Legacy core models
│   ├── hms_models.py                 # Comprehensive hospital management models
│   ├── schemas.py                    # Pydantic request/response schemas
│   ├── main.py                       # FastAPI application factory & middleware
│   ├── routers/                      # Modular API route controllers
│   │   ├── auth.py                   # Authentication & user profile
│   │   ├── assistant.py              # Clinical AI, RAG upload & SSE stream
│   │   ├── patients.py               # Patient records & clinical intake
│   │   ├── prediction.py             # ML risk prediction & retraining
│   │   ├── clustering.py             # Unsupervised patient clustering
│   │   ├── reports.py                # Medical report upload & OCR
│   │   ├── analytics.py              # Operational KPIs & outlier detection
│   │   ├── hms_dashboard.py          # Multi-role operational summaries
│   │   ├── hms_appointments.py       # Appointment bookings & scheduling
│   │   ├── hms_consultations.py      # Doctor consultations & diagnoses
│   │   ├── hms_prescriptions.py      # Prescription records & dosage
│   │   ├── hms_labs.py               # Lab orders & pathology results
│   │   ├── hms_pharmacy.py           # Pharmacy inventory & dispensing
│   │   ├── hms_billing.py            # Patient invoices & payments
│   │   ├── hms_departments.py        # Hospital department governance
│   │   ├── hms_emergency.py          # Emergency room (ER) triage board
│   │   ├── hms_icu.py                # Intensive Care Unit (ICU) tracking
│   │   ├── hms_ot.py                 # Operating Theatre (OT) schedules
│   │   ├── hms_housekeeping.py       # Bed sanitization & ward hygiene
│   │   ├── hms_canteen.py            # Hospital meals & therapeutic diet
│   │   ├── hms_staff.py              # Staff rosters & shift assignments
│   │   └── public_portal.py          # Public booking & doctor catalog
│   ├── services/                     # Business logic & background workers
│   │   ├── rag_service.py            # Chunking, vector embedding & search
│   │   ├── rag_progress.py           # Redis progress state & SSE event generator
│   │   ├── rag_queue.py              # RQ job dispatcher
│   │   ├── rag_worker.py             # Background vector indexing worker
│   │   ├── ml_service.py             # Scikit-Learn risk classification
│   │   ├── clustering_service.py     # Patient clustering algorithms
│   │   └── ocr_service.py            # Optical Character Recognition logic
│   └── utils/
│       └── security.py               # Password hashing (Argon2/Bcrypt) & JWT
│
├── frontend/                         # Modern React 18 + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               # PortalShell & responsive navigation
│   │   │   ├── shared/               # RAG Progress Bar, AI Chat, EHR Drawer
│   │   │   └── ui/                   # Badges, Cards, Modals, DataTables
│   │   ├── context/                  # AuthContext, ToastContext
│   │   ├── pages/                    # 10 role-based portal dashboards & views
│   │   │   ├── admin/                # Command dashboard, AI/RAG control, DB health
│   │   │   ├── doctor/               # Consultations, EHR, Lab orders, Meals
│   │   │   ├── nurse/                # Ward station, vitals tracking
│   │   │   ├── lab/                  # Pathology tests & diagnostics entry
│   │   │   ├── pharmacy/             # Medication stock & prescription dispensing
│   │   │   ├── reception/            # Front desk intake, appointments, billing
│   │   │   ├── worker/               # Housekeeping checklists & tasks
│   │   │   ├── canteen/              # Kitchen order fulfillment & menu
│   │   │   ├── patient/              # Personal EMR, appointments, prescriptions
│   │   │   └── public/               # Public doctor directory & booking
│   │   ├── services/                 # Axios & fetch API client wrappers
│   │   ├── types/                    # TypeScript interfaces for all schemas
│   │   └── index.css                 # Tailwind utilities & liquid-glow animations
│   ├── package.json
│   └── vite.config.ts
│
├── medical_knowledge/                # Trusted clinical reference PDFs / guidelines
├── uploads/                          # Temporary medical report storage
├── .env.example                      # Template for environment variables
├── requirements.txt                  # Python backend dependencies
└── README.md                         # Project documentation
```

---

## Getting Started & Installation

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 18.x or 20.x LTS
- **PostgreSQL**: 14 or higher (or cloud-hosted PostgreSQL)
- **Redis**: 7.x (or running via Docker: `docker run -d -p 6379:6379 redis:7-alpine`)
- **Tesseract OCR**: (Optional, for medical image OCR) [Tesseract Documentation](https://github.com/tesseract-ocr/tesseract)

---

### 1. Clone Repository

```bash
git clone https://github.com/abhi04110/AI-Healthcare.git
cd AI-Healthcare
```

---

### 2. Environment Configuration

Copy the example configuration to create your active `.env` file:

```bash
cp .env.example .env
```

Open `.env` and fill in your local secrets:

```env
# Database Credentials
DATABASE_URL=postgresql://postgres:password@localhost:5432/healthcare_db

# Security & Tokens
JWT_SECRET_KEY=generate_a_secure_random_hex_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Redis & Background Workers
REDIS_URL=redis://localhost:6379/0
RAG_QUEUE_NAME=medical-rag
RAG_SYNC_INTERVAL_HOURS=24

# AI Provider API Keys
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash

# Frontend Origin
FRONTEND_URL=http://localhost:5173
```

> [!CAUTION]
> Never commit your `.env` file to source control. It is strictly ignored by `.gitignore`.

---

### 3. Backend Setup

Create and activate a Python virtual environment:

**On Linux/macOS:**
```bash
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

**On Windows (PowerShell):**
```powershell
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

Start the FastAPI development server:
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API server will launch at `http://127.0.0.1:8000`.

---

### 4. Redis & Background RQ Worker

In a separate terminal, start the background worker responsible for processing RAG vectorization jobs:

**On Windows:**
```powershell
rq worker --worker-class rq.worker.SimpleWorker medical-rag
```

**On Linux/macOS:**
```bash
rq worker medical-rag
```

---

### 5. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The React clinical application will open at `http://localhost:5173`.

To verify production bundling:
```bash
npm run build
```

---

## API Documentation & Endpoints

Once the backend is running, interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc UI**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### Core Route Highlights

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | JWT OAuth2 password login |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & permissions |
| **RAG** | `POST` | `/api/v1/assistant/knowledge/upload` | Upload & enqueue medical reference document |
| **RAG** | `GET` | `/api/v1/assistant/knowledge/jobs/{id}/stream` | **SSE Real-time progress stream (0-100%)** |
| **RAG** | `POST` | `/api/v1/assistant/knowledge/reindex` | Full knowledge base vector re-synchronization |
| **AI** | `POST` | `/api/v1/assistant/ask` | Multi-LLM clinical Q&A grounded with RAG & EHR |
| **ML** | `POST` | `/api/v1/prediction/predict` | Predict patient risk from live measurements |
| **ML** | `POST` | `/api/v1/prediction/train` | Retrain clinical risk classifier on labelled data |
| **Cluster**| `POST` | `/api/v1/clustering/kmeans` | Execute unsupervised patient clustering |
| **OCR** | `POST` | `/api/v1/reports/{patient_id}/upload`| Upload medical diagnostic report & trigger OCR |
| **HMS** | `GET` | `/api/v1/hms/dashboard/overview` | Aggregated hospital KPI metrics |
| **HMS** | `POST` | `/api/v1/hms/appointments` | Book clinical appointment |
| **HMS** | `POST` | `/api/v1/hms/prescriptions` | Create digital prescription & medication order |
| **HMS** | `POST` | `/api/v1/hms/labs/orders` | Dispatch diagnostic laboratory order |

---

## Role-Based Access Control (RBAC)

The system enforces strict permission boundaries according to hospital governance:

| Role Identifier | Description | Accessible Workspace |
|---|---|---|
| `admin` | Super Administrator & Hospital Medical Director | Full Command, Staff Governance, ML/RAG Controls |
| `doctor` | Attending Physicians, Specialists, Surgeons | Clinical Consultations, EHR, Lab Orders, Rx, Critical Care |
| `nurse` | Inpatient Ward Nurses & Critical Care Staff | Vitals Monitoring, Bed Management, Shift Handover |
| `lab_technician` | Diagnostics Pathology Specialists | Lab Queue, Diagnostic Test Entry, Printable Reports |
| `pharmacist` | Chief Pharmacist & Dispensary Staff | Medicine Inventory, Prescription Fulfillment |
| `receptionist` | Front Desk & Intake Executives | Patient Registration, Appointments, Billing & Invoicing |
| `housekeeping_supervisor` / `worker` | Hospital Support & Sanitation | Sanitation Checklist, Bed Turnaround, Tasks |
| `canteen_manager` / `worker` | Dietary Kitchen Staff | Patient Nutrition Trays, Staff On-Call Meals |
| `patient` | Inpatient / Outpatient | Personal Medical History, Active Rx, Appointments |

---

## Clinical Disclaimer

> [!WARNING]
> **MedCore AI is designed for software development, healthcare data analysis, and clinical decision support demonstration.**
> - AI assistant outputs, predictions, and clustering models are algorithmic aids and **do not constitute medical diagnoses**.
> - Always verify critical health recommendations, medication dosages, and diagnoses with qualified, licensed medical professionals.

---

## Author & License

Developed with passion by **Abhishek Kumar**:
- **GitHub**: [@abhi04110](https://github.com/abhi04110)
- **Repository**: [AI-Healthcare](https://github.com/abhi04110/AI-Healthcare)

*Distributed under the MIT License. See `LICENSE` for more information.*
