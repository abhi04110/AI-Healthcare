# AI Healthcare Risk & Patient Analytics System

An AI-powered healthcare analytics and hospital management **backend** built with FastAPI, PostgreSQL, Machine Learning, OCR, and Retrieval-Augmented Generation (RAG).

The system combines patient and medical record management, health-risk prediction, patient clustering, healthcare analytics, hospital operations, and a medical knowledge assistant in a modular REST API.

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Redis and Background RAG Indexing](#redis-and-background-rag-indexing)
- [RAG Document Processing Workflow](#rag-document-processing-workflow)
- [AI Assistant and Retrieval](#ai-assistant-and-retrieval)
- [API Documentation](#api-documentation)
- [Machine Learning Workflow](#machine-learning-workflow)
- [OCR Workflow](#ocr-workflow)
- [Database Design](#database-design)
- [Security and Access Control](#security-and-access-control)
- [Troubleshooting](#troubleshooting)
- [Limitations and Disclaimer](#limitations-and-disclaimer)
- [Future Improvements](#future-improvements)
- [Author](#author)

## Project Overview

Healthcare systems manage patient profiles, health measurements, medical reports, appointments, laboratory results, prescriptions, billing information, and other operational records.

This project provides a centralized backend for healthcare data management and analysis. It integrates conventional hospital management functionality with machine learning, OCR-based report processing, patient segmentation, statistical analytics, and AI-assisted medical knowledge retrieval.

### Project Objectives

- Centralize patient and hospital-related information.
- Provide authenticated REST APIs with role-aware access control.
- Manage patient profiles, health records, and medical reports.
- Extract text from supported medical documents.
- Predict health-risk categories using machine learning.
- Group patient records using clustering algorithms.
- Generate healthcare summaries and identify statistical outliers.
- Support hospital operations, including appointments, laboratory workflows, prescriptions, pharmacy, billing, and emergency management.
- Enable natural-language questions about healthcare information.
- Retrieve relevant information from uploaded medical reference documents.
- Process document indexing in the background using Redis and RQ.
- Reconcile the medical knowledge index periodically.

## Key Features

### 1. Authentication and User Management

The authentication module supports:

- User registration and login.
- JWT access-token generation.
- Password hashing and verification.
- Current-user profile retrieval.
- Role-aware access control.
- Admin-managed user operations.
- Patient-access restrictions based on application permissions.

The application includes roles such as Admin, Doctor, and Staff, as implemented in the authentication and authorization logic.

### 2. Patient Management

Patient-related functionality includes:

- Patient codes and personal details.
- Age, gender, contact information, and address.
- Medical history.
- Patient-associated health records.
- Medical reports and extracted information.
- Risk-prediction history.
- Patient timeline and related information.

Access to patient information is subject to the application's authorization rules.

### 3. Health Records

The system manages structured health measurements associated with patients, including supported fields such as:

- Glucose
- Blood pressure
- BMI
- Cholesterol
- Heart rate
- Risk labels, where available

These records can support analytics, machine-learning training, and risk prediction when the required values are available.

### 4. Medical Report Management

The report module supports uploading and managing medical reports according to the implemented endpoint schemas.

Supported report types and operations should be checked in the running API documentation. Report processing can include file metadata, extracted text, and patient association.

### 5. Optical Character Recognition (OCR)

The OCR functionality uses technologies including:

- Tesseract OCR
- Pytesseract
- Pillow
- PyPDF

OCR can extract text from supported images and documents. Text-based PDFs can be processed through PDF text extraction. Scanned PDFs may require OCR processing, depending on the service implementation.

OCR output can contain recognition errors and should be reviewed before clinical use.

### 6. Machine Learning Health-Risk Prediction

The ML service uses a Random Forest Classifier to classify health-risk records into categories such as:

- Low
- Medium
- High

The model uses six features in its configured workflow:

1. Age
2. Glucose
3. Blood pressure
4. BMI
5. Cholesterol
6. Heart rate

Prediction responses can include the predicted category and confidence or probability information, depending on the endpoint.

The repository's configured model path is:

`ml_models/health_risk_model.joblib`

Actual model availability depends on the files present in the local environment.

### 7. Model Training and Scheduling

The machine-learning module supports model-status checks, training-data readiness checks, training, evaluation, model persistence, and prediction history.

The training service reads labelled health records from PostgreSQL. The `ML_RETRAIN_INTERVAL_HOURS` setting controls the configured scheduled training interval.

Model performance depends on the quantity, quality, representativeness, and correctness of the training data. High accuracy on a small or synthetic dataset does not establish clinical validity.

### 8. Patient Clustering

The clustering module supports the configured algorithms:

- K-Means
- DBSCAN
- Hierarchical Clustering

These methods help explore patterns and similarities among available patient records. Cluster membership is an analytical result and not a medical diagnosis.

### 9. Healthcare Analytics

The analytics module provides supported statistical summaries, including:

- Patient counts.
- Health-record summaries.
- Averages of available health measurements.
- Risk-category distributions.
- Statistical outlier analysis.

The configured outlier-detection workflow uses the Interquartile Range (IQR) method for supported numerical data.

### 10. AI Healthcare Assistant

The AI assistant provides a natural-language interface to healthcare information.

The project includes integrations for language-model providers such as Groq and Google Gemini through the configured AI integration layer.

Depending on the question and implemented routing logic, the assistant can work with available healthcare data or retrieve relevant medical knowledge from indexed reference documents.

Example questions include:

- "Summarize the available medical reports."
- "How many patients are registered?"
- "What is the average glucose level?"
- "According to the WHO hypertension guideline, which medicine classes are recommended?"
- "Summarize the relevant information in the available medical references."

Actual answers depend on the database contents, document index, permissions, provider configuration, and implementation of the relevant endpoint.

### 11. Retrieval-Augmented Generation (RAG)

The RAG module allows the assistant to retrieve relevant information from local medical reference documents before generating an answer.

Its main components are:

- Document storage
- Text extraction
- Chunking
- Sentence Transformers embeddings
- ChromaDB vector storage
- Similarity-based retrieval
- Language-model answer generation
- Source metadata for document and page references

The configured embedding model is:

`sentence-transformers/all-MiniLM-L6-v2`

The configured retrieval target is controlled by `RAG_TOP_K`.

RAG helps ground responses in available documents, but retrieved content and generated answers still require appropriate verification.

### 12. Background Document Indexing

Document indexing is separated from the upload request using Redis and RQ.

The workflow is:

1. A supported document is uploaded through the API.
2. The file is saved in the configured medical knowledge directory.
3. The upload endpoint requests an indexing job through the RQ queue.
4. Redis stores the queued job information.
5. A running RQ worker consumes jobs from the configured queue.
6. The worker invokes the RAG ingestion service.
7. The service extracts text, creates chunks and embeddings, and updates the vector store.
8. Job status and worker logs can be checked to determine whether processing succeeded.

The upload endpoint returning an accepted or queued status does not by itself prove that indexing has completed.

### 13. Daily Medical Knowledge Synchronization

The RAG scheduler is started as part of the FastAPI application lifespan.

The configured `RAG_SYNC_INTERVAL_HOURS` setting controls the interval between scheduled sync attempts. The example configuration uses a 24-hour interval.

A synchronization run can inspect the document directory and reconcile the vector index according to the ingestion service's change-detection and cleanup logic.

The intended behaviour is:

- Index new documents.
- Skip unchanged files when change detection confirms that they are unchanged.
- Update indexed content when a document changes.
- Remove indexed chunks for documents that have been deleted from the source directory.

Successful synchronization depends on Redis availability, a running worker, and successful execution of the ingestion job. These behaviours should be verified through job results and retrieval tests.

### 14. Hospital Management System

The backend also includes modules for common hospital operations.

| Module | Responsibility |
|---|---|
| Departments | Department records |
| Staff | Staff management |
| Assignments | Patient-doctor assignments |
| Appointments | Appointment scheduling and status |
| Consultations | Consultation records |
| Prescriptions | Prescription management |
| Laboratory | Lab orders and results |
| Pharmacy | Medicine inventory and dispensing |
| Billing | Bills, bill items, and payments |
| Emergency | Emergency-case management |
| ICU | ICU admission management |
| Operation Theatre | Operation-theatre case management |
| Housekeeping | Housekeeping tasks |
| Canteen | Menu and order management |
| Dashboard | Hospital dashboard information |
| Public Portal | Public-facing hospital and patient portal APIs |

Exact endpoint methods, fields, and permissions are defined by the router implementations and can be inspected through Swagger UI.

## Technology Stack

| Category | Technologies |
|---|---|
| Programming language | Python |
| API framework | FastAPI |
| ASGI server | Uvicorn |
| Main database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | JWT using PyJWT |
| Password security | pwdlib / Argon2 support |
| Data processing | Pandas, NumPy |
| Machine learning | Scikit-learn |
| Model persistence | Joblib |
| OCR | Tesseract, Pytesseract, Pillow |
| PDF processing | PyPDF, PyMuPDF |
| Document processing | python-docx, openpyxl and supported format libraries |
| AI integrations | LangChain integrations, Groq, Google Gemini |
| Embeddings | Sentence Transformers |
| Vector database | ChromaDB |
| Background jobs | Redis and RQ |
| Redis deployment for local development | Docker |
| Configuration | python-dotenv |

## Project Structure

The following structure highlights the main application files and the RAG-related components. Other modules and supporting files may also exist in the repository.

```text
AI-Healthcare/
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── hms_models.py
│   ├── schemas.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── reports.py
│   │   ├── ocr.py
│   │   ├── prediction.py
│   │   ├── clustering.py
│   │   ├── analytics.py
│   │   ├── assistant.py
│   │   ├── public_portal.py
│   │   └── hms_*.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── analytics_service.py
│   │   ├── clustering_service.py
│   │   ├── ml_service.py
│   │   ├── ml_scheduler.py
│   │   ├── ocr_service.py
│   │   ├── rag_service.py
│   │   ├── rag_queue.py
│   │   ├── rag_worker.py
│   │   └── rag_scheduler.py
│   └── utils/
│       └── security.py
├── datasets/
├── ml_models/
├── medical_knowledge/
├── vector_store/
└── uploads/
```

The `medical_knowledge/`, `vector_store/`, and `uploads/` directories are local runtime storage locations when configured that way. Their contents may not be tracked by Git and may need to be recreated or restored when setting up another environment.

### Important Files

- `app/main.py` — Creates the FastAPI application, registers routers, initializes database metadata and starts application-lifespan schedulers.
- `app/config.py` — Loads environment variables and defines database, JWT, AI, RAG, Redis, and scheduler settings.
- `app/database.py` — Configures SQLAlchemy and database connectivity.
- `app/models.py` — Defines core healthcare data models.
- `app/hms_models.py` — Defines hospital-management data models.
- `app/routers/` — Contains API endpoints grouped by functionality.
- `app/services/rag_service.py` — Handles medical-document ingestion and vector-index operations.
- `app/services/rag_queue.py` — Connects to Redis and enqueues RQ jobs.
- `app/services/rag_worker.py` — Provides the background indexing job function.
- `app/services/rag_scheduler.py` — Enqueues periodic RAG synchronization jobs.
- `app/services/ml_service.py` — Contains machine-learning training and prediction logic.
- `app/services/ocr_service.py` — Contains OCR and document text-extraction logic.
- `medical_knowledge/` — Local source documents for the RAG knowledge base.
- `vector_store/` — Local ChromaDB persistence directory, as configured.
- `requirements.txt` — Python dependencies.
- `.env.example` — Example configuration template.

## System Architecture

The backend is divided into API routing, business logic, database access, machine learning, document processing, and retrieval components.

```text
Client / Swagger UI
        |
        v
FastAPI Application
        |
        ├── Authentication and Access Control
        ├── Patient and Medical Report APIs
        ├── OCR and Report Processing
        ├── ML Prediction and Training
        ├── Clustering and Analytics
        ├── AI Healthcare Assistant
        └── Hospital Management APIs
                  |
                  v
             Service Layer
                  |
       ┌──────────┼──────────┐
       v          v          v
  PostgreSQL   ML / OCR   AI / RAG
                             |
                 ┌───────────┴───────────┐
                 v                       v
           ChromaDB Vector Store    Groq / Gemini
                 ^
                 |
        RAG Ingestion Service
                 ^
                 |
             RQ Worker
                 ^
                 |
           Redis Job Queue
                 ^
                 |
        Document Upload / Scheduler
```

Redis and PostgreSQL have different roles. PostgreSQL stores structured application records. Redis is used by RQ to manage background jobs. ChromaDB stores vectors and document chunks for semantic retrieval.

## Installation and Setup

### Prerequisites

Install or configure:

- Python compatible with the project's dependencies.
- PostgreSQL and a valid database connection.
- Git.
- Docker Desktop for the local Redis container.
- Tesseract OCR for OCR operations that require it.
- AI-provider API keys if using configured external language-model services.

### 1. Clone the Repository

```powershell
git clone https://github.com/abhi04110/AI-Healthcare.git
cd AI-Healthcare
```

If the project is already present on your computer, open PowerShell in the project root—the directory containing `app/` and `requirements.txt`.

### 2. Create and Activate a Virtual Environment

```powershell
python -m venv env
.\env\Scripts\Activate.ps1
```

### 3. Install Dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Some libraries, particularly embedding and OCR dependencies, may require additional system resources or platform-specific setup.

### 4. Configure PostgreSQL

Create or select a PostgreSQL database and obtain its connection URL.

Example format:

```text
postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

Replace the example values with your actual database configuration. URL-encode special characters in credentials when necessary.

### 5. Configure Environment Variables

Create `.env` from the example template:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure the actual values required by the application. Do not overwrite an existing working `.env` without preserving its values.

**Never commit `.env`, real API keys, database passwords, or other secrets to GitHub.**

### 6. Configure Tesseract OCR

Install Tesseract OCR on Windows and confirm that it is accessible.

```powershell
tesseract --version
```

The OCR service may use the following Windows installation path:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

The configured path must match the actual installation.

### 7. Start PostgreSQL

Ensure PostgreSQL is running and the database configured in `DATABASE_URL` is reachable before starting the application.

## Environment Configuration

The exact variables used by the running version are defined in `.env.example` and `app/config.py`.

Common settings include:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET_KEY` | Secret for signing JWTs |
| `JWT_ALGORITHM` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `FRONTEND_URL` | Allowed CORS origin |
| `ML_RETRAIN_INTERVAL_HOURS` | ML scheduler interval |
| `GROQ_API_KEY` | Groq API credential, if enabled |
| `GROQ_MODEL` | Configured Groq model identifier |
| `GEMINI_API_KEY` | Google Gemini credential, if enabled |
| `GEMINI_MODEL` | Configured Gemini model identifier |
| `MEDICAL_KNOWLEDGE_DIR` | Source-document directory |
| `VECTOR_STORE_DIR` | ChromaDB persistence directory |
| `RAG_EMBEDDING_MODEL` | Embedding model identifier |
| `RAG_CHUNK_SIZE` | Target chunk size |
| `RAG_CHUNK_OVERLAP` | Chunk overlap |
| `RAG_TOP_K` | Target number of retrieved chunks |
| `RAG_MAX_CONTEXT_CHARS` | Configured RAG context-size limit |
| `REDIS_URL` | Redis connection URL |
| `RAG_QUEUE_NAME` | RQ queue name |
| `RAG_SYNC_INTERVAL_HOURS` | Periodic RAG sync interval |
| `RAG_JOB_TIMEOUT_SECONDS` | Background job timeout |
| `RAG_UPLOAD_MAX_MB` | Configured upload size limit |

Example values for the RAG configuration are:

```dotenv
MEDICAL_KNOWLEDGE_DIR=medical_knowledge
VECTOR_STORE_DIR=vector_store
RAG_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=150
RAG_TOP_K=4
RAG_MAX_CONTEXT_CHARS=12000
REDIS_URL=redis://localhost:6379/0
RAG_QUEUE_NAME=medical-rag
RAG_SYNC_INTERVAL_HOURS=24
RAG_JOB_TIMEOUT_SECONDS=1800
RAG_UPLOAD_MAX_MB=25
```

Use the values from the actual `.env.example` and `app/config.py` in your checkout. The example above is not a replacement for any additional required settings.

## Running the Application

### 1. Start the Redis Container

Docker Desktop must be running.

Create the Redis container once if it does not already exist:

```powershell
docker run -d --name healthcare-redis -p 6379:6379 redis:7-alpine
```

On subsequent runs, start the existing container:

```powershell
docker start healthcare-redis
```

If Docker reports that the container is already running, you can check its status instead of creating another one.

Verify Redis:

```powershell
docker exec healthcare-redis redis-cli ping
```

Expected output:

```text
PONG
```

### 2. Start the RQ Worker

Open a separate PowerShell terminal in the project directory:

```powershell
cd C:\Users\HP\Desktop\healthcare_ai
.\env\Scripts\Activate.ps1
rq worker --worker-class rq.worker.SimpleWorker medical-rag
```

The project uses `SimpleWorker` in this Windows setup because the default RQ worker previously encountered an `os.fork` compatibility error.

Keep the worker terminal open. It processes queued jobs and displays success or failure logs.

### 3. Start FastAPI

Open another PowerShell terminal:

```powershell
cd C:\Users\HP\Desktop\healthcare_ai
.\env\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

If the backend is already running, do not start a second instance unnecessarily.

### 4. Open API Documentation

After startup succeeds:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Root endpoint: `http://127.0.0.1:8000/`
- Health endpoint: `http://127.0.0.1:8000/health`

A successful health response alone does not prove that PostgreSQL, Redis, the RQ worker, the ML model, OCR, or external AI services are all working.

## Redis and Background RAG Indexing

Redis is used as the job queue backend for RQ. It is not the main healthcare database and does not store the permanent medical knowledge index.

### Responsibilities

| Component | Responsibility |
|---|---|
| FastAPI | Receives upload requests |
| `rag_queue.py` | Enqueues background indexing jobs |
| Redis | Stores queue and job state |
| RQ worker | Executes indexing jobs |
| `rag_worker.py` | Calls the ingestion service |
| `rag_service.py` | Extracts, chunks, embeds, and indexes documents |
| ChromaDB | Stores searchable vectors and document metadata |
| `rag_scheduler.py` | Enqueues periodic reconciliation jobs |

### Upload-to-Indexing Workflow

1. Upload a supported file using the appropriate Swagger endpoint.
2. The API saves the file in the configured medical knowledge directory.
3. The upload endpoint queues an indexing job through `enqueue_rag_sync()`.
4. Redis stores the job in the configured RQ queue.
5. The running worker listens to the queue and executes available jobs.
6. The ingestion service processes documents and updates the vector store.
7. Inspect the worker logs and job result to confirm successful completion.
8. Test document retrieval through the assistant or the available document-listing endpoint.

An `accepted`, `queued`, or `already_queued` response does not necessarily mean that a document has finished indexing.

### Running the Worker Manually

From an activated virtual environment:

```powershell
rq worker --worker-class rq.worker.SimpleWorker medical-rag
```

Run this command once per worker process and leave the terminal running. You do not need to start a new worker for every uploaded file.

If the worker stops, queued jobs may remain pending until a worker starts again. Redis must also be reachable.

### Manual Indexing Job

If a manual synchronization is needed, run the following from the project root with the virtual environment activated:

```powershell
python -c "from app.services.rag_queue import enqueue_rag_sync; print(enqueue_rag_sync('manual-sync'))"
```

Check the returned job information and the worker logs. If the result indicates an existing queued job, inspect that job rather than assuming a new job was created.

### Daily Synchronization

The application starts `rag_daily_scheduler()` during FastAPI startup. The scheduler attempts to enqueue a synchronization job at the configured interval.

For the configured 24-hour interval, the intended process is:

1. The scheduler attempts to enqueue a sync job.
2. Redis stores the job.
3. The RQ worker executes the job when available.
4. The ingestion service scans and reconciles the source documents.
5. The scheduler waits for the configured interval before its next attempt.

For reliable operation, the backend, Redis, and worker must be available. If Redis is unavailable when the scheduler attempts to enqueue a job, review the backend logs and restart or manually enqueue synchronization as needed.

## RAG Document Processing Workflow

The ingestion service is responsible for turning source documents into searchable content.

### Supported Formats

The document-listing response in the current setup reports support for these formats:

- PDF
- TXT
- MD
- DOCX
- XLSX
- XLS
- CSV
- PNG
- JPG
- TIFF
- BMP
- WEBP

Actual processing depends on the installed dependencies and the implementation for each format. Confirm format support through the running API and successful indexing tests.

### Processing Stages

**1. File storage**

The uploaded file is saved to the configured source-document directory.

**2. Text extraction**

The ingestion service extracts text from the supported document format. Image-based or scanned content may require OCR.

**3. Chunking**

Long extracted text is divided into smaller sections. The configured chunk size and overlap determine how text is segmented.

**4. Embedding generation**

The embedding model converts chunks into numerical vectors for similarity-based retrieval.

**5. Vector storage**

The chunks, embeddings, and associated metadata are persisted in the configured ChromaDB store.

**6. Retrieval**

When a user asks a question, relevant indexed chunks can be retrieved and passed to the language model as context.

### Incremental Synchronization

The intended reconciliation behaviour is:

| Source-document change | Expected index action |
|---|---|
| New file | Add its searchable chunks |
| Unchanged file | Skip reprocessing when change detection confirms no change |
| Modified file | Update its indexed content |
| Deleted file | Remove its indexed chunks during successful reconciliation |

These outcomes depend on the ingestion service's implementation and a successful job run. Use the job results and retrieval tests to verify actual behaviour.

### Local Storage

The source documents and vector index are separate:

- `medical_knowledge/` contains source documents.
- `vector_store/` contains the local vector index, according to the configured persistence path.
- Redis manages background job state.

The vector index is derived data and can require reindexing if it is missing or incompatible. Keep the source documents and configuration backed up appropriately.

## AI Assistant and Retrieval

The main assistant question-answering endpoint is registered under the assistant router. Inspect Swagger UI for the exact request schema and available operations.

A typical RAG question-answering flow is:

1. Receive the user's question.
2. Determine the relevant information source according to the implemented assistant logic.
3. Retrieve relevant medical document chunks from ChromaDB.
4. Construct a prompt containing the question and retrieved context.
5. Call the configured language-model provider.
6. Return the answer and available source metadata.

Source metadata may include the filename and page number. Citations help users trace an answer back to a reference document, but they do not guarantee that the answer is correct or that the source is authoritative.

For patient-specific questions, authorization and patient scoping are essential. Only the minimum necessary, authorized patient context should be used. General medical questions should not require unrelated patient records.

## API Documentation

The routes are registered through `app/main.py`. Use Swagger UI to inspect the exact methods, paths, request bodies, response schemas, and authentication requirements for the running version.

### Main API Modules

| Module | Responsibility |
|---|---|
| Authentication | Registration, login, profile, and user administration |
| Patients | Patient profiles and related health-record operations |
| Medical Reports | Report upload and management |
| OCR | Medical document text extraction |
| Prediction | Health-risk prediction and model operations |
| Clustering | Patient segmentation |
| Analytics | Healthcare summaries and outlier analysis |
| Assistant | Natural-language healthcare questions and medical knowledge retrieval |
| Public Portal | Public-facing hospital and patient portal operations |
| HMS Departments | Department operations |
| HMS Staff | Staff operations |
| HMS Assignments | Patient assignments |
| HMS Appointments | Appointment management |
| HMS Consultations | Consultation operations |
| HMS Prescriptions | Prescription operations |
| HMS Laboratory | Lab orders and results |
| HMS Pharmacy | Pharmacy operations |
| HMS Billing | Billing operations |
| HMS Emergency | Emergency-case operations |
| HMS ICU | ICU admission operations |
| HMS Operation Theatre | Operation-theatre operations |
| HMS Housekeeping | Housekeeping operations |
| HMS Canteen | Canteen operations |
| HMS Dashboard | Hospital dashboard information |

### Authentication

The authentication router is registered under `/auth`.

Implemented operations include registration, login, profile retrieval, and protected user-management operations. Use the authentication mechanism shown in Swagger UI for protected routes.

### Assistant Endpoint

The assistant question-answering endpoint is:

`POST /assistant/ask`

Use the running OpenAPI documentation to inspect the exact request schema and response format.

### Basic Health Checks

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Application-running message |
| GET | `/health` | Basic health status |
| GET | `/database-check` | Database connectivity check; admin access required |
| GET | `/tables` | Lists public-schema tables; admin access required |

## Machine Learning Workflow

The ML service is implemented in `app/services/ml_service.py`.

### Training Process

1. Retrieve eligible labelled health records from PostgreSQL.
2. Validate required fields and risk labels.
3. Prepare the configured numerical features.
4. Split data into training and testing sets.
5. Fit the configured Random Forest model.
6. Evaluate the model on the test split.
7. Save the serialized model and available training metadata.

The configured serialized model path is:

`ml_models/health_risk_model.joblib`

A high score on a small or synthetic dataset does not establish real-world clinical accuracy.

## OCR Workflow

OCR functionality is implemented in `app/services/ocr_service.py` and exposed through the relevant routers.

For supported images, the service can use Pillow and Tesseract through Pytesseract. Text-based PDFs can be processed through PDF extraction libraries.

Scanned PDF handling depends on whether the service renders pages for OCR. Image quality, page layout, scan quality, and language affect extraction accuracy.

Always verify extracted values before using them for clinical or administrative decisions.

## Database Design

The application uses SQLAlchemy models and PostgreSQL.

### Core Healthcare Models

The core model file defines healthcare entities such as:

- User
- Patient
- HealthRecord
- MedicalReport
- RiskPrediction

### Hospital Management Models

The hospital model file defines entities for departments, staff, assignments, appointments, consultations, prescriptions, laboratory workflows, medicines, billing, emergency cases, ICU admissions, operation-theatre cases, housekeeping, and canteen operations.

The application initializes SQLAlchemy metadata and invokes a runtime-schema helper during startup. Production deployments should use a controlled database migration process and appropriate database permissions.

## Security and Access Control

Security-related functionality includes:

- JWT-based authentication.
- Password hashing and verification.
- Role-aware endpoint permissions.
- Patient-access checks.
- Environment-based configuration.
- Configurable CORS origin.

### Security Recommendations

- Use a strong, randomly generated JWT secret.
- Keep `.env` out of version control.
- Never publish API keys, database credentials, or passwords.
- Use HTTPS and appropriate infrastructure protections in deployed environments.
- Apply least-privilege database permissions.
- Restrict access to medical documents and uploaded files.
- Validate authorization before returning patient-specific information.
- Avoid logging sensitive medical information or credentials.
- Use synthetic or properly de-identified data for demonstrations.
- Back up source documents and databases according to the applicable data-protection requirements.

## Troubleshooting

### Application reports that `DATABASE_URL` is missing

Check that `.env` exists in the project root and contains a valid `DATABASE_URL`. Start the application from the correct project directory.

### PostgreSQL connection fails

Verify that PostgreSQL is running, the host and port are correct, the database exists, and the credentials are valid.

### Redis does not respond

Check Docker container status:

```powershell
docker ps -a
```

Start the existing container if necessary:

```powershell
docker start healthcare-redis
```

Check connectivity:

```powershell
docker exec healthcare-redis redis-cli ping
```

The expected response is `PONG`.

### RAG upload is accepted, but indexing does not complete

1. Verify that Redis is reachable.
2. Start the RQ worker using the documented Windows-compatible command.
3. Inspect the worker terminal for job execution and errors.
4. Check the returned job ID and status.
5. Verify the source file exists in the configured directory.
6. Confirm that the required document-processing and embedding dependencies are installed.
7. Inspect the ingestion job result and test retrieval again.

An accepted upload response alone does not confirm successful indexing.

### RQ worker reports an `os.fork` error on Windows

Use the worker command configured for this development environment:

```powershell
rq worker --worker-class rq.worker.SimpleWorker medical-rag
```

### The RAG assistant cannot retrieve a document

Check that the document is indexed, the vector-store path is correct, the embedding dependencies are installed, and the source metadata is present. If necessary, run a controlled synchronization and inspect the worker result.

### The scheduled sync is not running

Confirm that the FastAPI application started successfully, Redis was available when the scheduler attempted to enqueue the job, and a worker is listening on the configured queue. Inspect backend and worker logs.

### Tesseract executable is not found

Install Tesseract OCR and confirm that the configured executable path matches the installation.

### The ML model is not ready

Check the model-status endpoint, verify the model file exists, and confirm that sufficient complete labelled records are available for training.

### AI assistant requests fail

Verify the configured provider credentials and model identifier. Confirm that the provider is available and that the selected model is supported by the account.

### Swagger shows authorization or validation errors

Review the endpoint's request schema and authentication requirements in `/docs`. Authenticate before calling protected endpoints and supply the expected request fields.

## Limitations and Disclaimer

- This repository is a backend application; a frontend application is not described as part of this backend README.
- RAG indexing depends on Redis, the RQ worker, document-processing dependencies, and ChromaDB availability.
- Upload acceptance is not equivalent to indexing completion.
- Daily reconciliation is attempted according to the configured scheduler interval but is not guaranteed to succeed when dependencies are unavailable.
- OCR results can contain recognition errors.
- ML predictions depend on data quality, coverage, and model performance.
- Clustering and outlier detection are analytical tools, not diagnoses.
- RAG citations do not independently verify the correctness of generated answers.
- Medical information may be incomplete or outdated and should be checked against trusted clinical guidance.
- A successful local run does not establish production readiness, regulatory compliance, data-protection compliance, or clinical validation.

**This project is intended for software development, healthcare data analysis, and decision-support experimentation. It is not a substitute for professional medical judgment, diagnosis, or treatment.**

## Future Improvements

Potential improvements include:

- Automated tests and continuous integration.
- More robust RAG indexing and synchronization tests.
- Better background-job monitoring and retry handling.
- Controlled database migrations.
- Improved OCR preprocessing and scanned-document support.
- Model evaluation using larger, clinically validated datasets.
- Audit logging and operational monitoring.
- Deployment hardening, secure file storage, and backup procedures.
- Improved document-level access control and source validation.

## Author

**Abhishek Kumar**

GitHub: [@abhi04110](https://github.com/abhi04110)

Repository: [AI-Healthcare](https://github.com/abhi04110/AI-Healthcare)
