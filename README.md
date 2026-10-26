# AI Healthcare Risk & Patient Analytics System

An AI-powered healthcare analytics and hospital management **backend** built with FastAPI, PostgreSQL, Machine Learning, OCR, patient analytics, and AI-assisted healthcare information retrieval.

The project combines patient and medical record management with health-risk prediction, medical report processing, patient clustering, healthcare analytics, and hospital operational modules in a single REST API.

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [API Modules](#api-modules)
- [Machine Learning Workflow](#machine-learning-workflow)
- [OCR Workflow](#ocr-workflow)
- [Database Design](#database-design)
- [Security and Access Control](#security-and-access-control)
- [Troubleshooting](#troubleshooting)
- [Limitations and Disclaimer](#limitations-and-disclaimer)

## Project Overview

Healthcare systems manage patient profiles, health measurements, medical reports, appointments, laboratory results, prescriptions, billing information, and other operational records.

This project provides a centralized backend to manage healthcare information and support data-driven analysis. It combines conventional hospital management operations with machine learning, OCR-based report extraction, statistical analytics, patient clustering, and an AI healthcare assistant.

### Project Objectives

- Centralize patient and hospital-related data.
- Provide authenticated access to healthcare APIs.
- Manage patient profiles, health records, and medical reports.
- Extract text from supported medical documents.
- Predict health-risk categories using a trained ML model.
- Group patient records using clustering algorithms.
- Generate healthcare summaries and identify statistical outliers.
- Support appointments, laboratory workflows, prescriptions, pharmacy, billing, and other hospital operations.
- Allow natural-language questions about available healthcare information through an AI assistant.

## Key Features

### 1. Authentication and User Management

The authentication module provides:

- User registration and login.
- JWT access-token generation.
- Password hashing and verification.
- Current-user profile retrieval.
- Role-aware access control.
- Admin-managed user creation.
- Patient-access restrictions based on application permissions.

The application uses roles such as `admin`, `doctor`, and `staff` in its authentication and access-control logic.

### 2. Patient Management

Patient APIs support the management of patient information, including:

- Patient code and personal details.
- Age and gender.
- Contact information and address.
- Medical history.
- Patient-specific health records.
- Patient-specific medical reports.
- Risk-prediction history.
- Patient timeline and related information.

Patient access is handled through application-level authorization and patient-access services.

### 3. Health Records

The system stores structured health measurements associated with patients.

The health-record and ML modules use fields such as:

- Glucose
- Blood pressure
- BMI
- Cholesterol
- Heart rate
- Risk label, where available

These measurements support health analytics and risk-model training or prediction when the required values are available.

### 4. Medical Report Management

The report module supports uploading and managing medical reports associated with patients.

Supported document types include:

- PDF
- PNG
- JPG
- JPEG

Report records can contain file information, extracted text, patient association, and upload-related metadata.

### 5. Optical Character Recognition (OCR)

The OCR module processes supported medical documents and extracts text.

Technologies used:

- Tesseract OCR
- Pytesseract
- Pillow
- PyPDF

The OCR service uses Tesseract for image-based documents and PyPDF for extracting embedded text from PDF pages.

Extracted text can be processed by the application's report-related workflows. OCR output may contain recognition errors and should be reviewed before use.

### 6. Machine Learning Health-Risk Prediction

The ML service uses a **Random Forest Classifier** to classify health-risk records into categories:

- Low
- Medium
- High

The six model features are:

1. Age
2. Glucose
3. Blood pressure
4. BMI
5. Cholesterol
6. Heart rate

The prediction service returns a predicted risk category, confidence information, and class probabilities when the model supports them.

The repository includes a serialized model file at `ml_models/health_risk_model.joblib`.

### 7. Model Training and Status

The prediction module includes model-related operations for:

- Checking model status.
- Reviewing training-data readiness.
- Training the risk model.
- Evaluating model performance.
- Saving the trained model.
- Tracking training metadata.
- Generating predictions from health measurements.
- Retrieving prediction history.

Training reads complete, labelled health records from PostgreSQL. The training service checks that enough records and risk classes are available before fitting the model.

The application also includes a scheduled ML training service configured through `ML_RETRAIN_INTERVAL_HOURS`.

### 8. Patient Clustering

The clustering module provides three patient-segmentation approaches:

- K-Means
- DBSCAN
- Hierarchical Clustering

The service prepares patient health measurements and uses numerical feature scaling where appropriate.

Clustering can help explore similarities and patterns in available patient data. Cluster membership is an analytical result, not a medical diagnosis.

### 9. Healthcare Analytics

The analytics service provides healthcare summaries and statistical analysis, including:

- Total patient counts.
- Health-record summaries.
- Average age and available health measurements.
- Risk-category distribution.
- Statistical outlier detection.

The outlier-detection service uses the Interquartile Range (IQR) method to identify unusually high or low values in supported numerical data.

### 10. AI Healthcare Assistant

The AI assistant provides a natural-language interface to supported healthcare information.

The implementation uses LangChain integrations for:

- Google Gemini
- Groq

The configured environment variables allow the application to select provider models. The assistant's implementation includes provider fallback logic.

Example questions that illustrate the intended usage:

- “Show the latest health information for a patient.”
- “Summarize the available medical reports.”
- “How many patients are registered?”
- “Show the available risk-prediction information.”
- “What is the average glucose level?”

Actual answers depend on the records available in the database, the assistant's implemented query logic, and valid AI-provider configuration.

### 11. Hospital Management System (HMS)

In addition to healthcare analytics, the backend includes modules for common hospital operations.

| Module | Main responsibility |
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
| Emergency | Emergency-case records and status |
| ICU | ICU admissions and status |
| Operation Theatre | Operation-theatre case management |
| Housekeeping | Housekeeping tasks and assignments |
| Canteen | Menu, orders, and order status |
| Dashboard | Hospital dashboard information |
| Public Portal | Public-facing hospital and patient portal APIs |

The exact operations available for each module are defined in its corresponding router file.

## Technology Stack

| Category | Technologies |
|---|---|
| Language | Python |
| API framework | FastAPI |
| ASGI server | Uvicorn |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | JWT using PyJWT |
| Password security | pwdlib with Argon2 support |
| Request validation | FastAPI and Pydantic schemas |
| Data processing | Pandas, NumPy |
| Machine learning | Scikit-learn |
| Model persistence | Joblib |
| OCR | Tesseract, Pytesseract, Pillow |
| PDF text extraction | PyPDF |
| AI integration | LangChain, Google Gemini integration, Groq integration |
| Configuration | python-dotenv |

## Project Structure

The following structure is based on the files included in the repository.

```text
AI-Healthcare-main/
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
│
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── hms_models.py
│   ├── schemas.py
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── reports.py
│   │   ├── ocr.py
│   │   ├── prediction.py
│   │   ├── clustering.py
│   │   ├── analytics.py
│   │   ├── assistant.py
│   │   ├── public_portal.py
│   │   ├── hms_departments.py
│   │   ├── hms_staff.py
│   │   ├── hms_assignments.py
│   │   ├── hms_appointments.py
│   │   ├── hms_consultations.py
│   │   ├── hms_prescriptions.py
│   │   ├── hms_labs.py
│   │   ├── hms_pharmacy.py
│   │   ├── hms_billing.py
│   │   ├── hms_emergency.py
│   │   ├── hms_icu.py
│   │   ├── hms_ot.py
│   │   ├── hms_housekeeping.py
│   │   ├── hms_canteen.py
│   │   └── hms_dashboard.py
│   │
│   ├── services/
│   │   ├── access_service.py
│   │   ├── analytics_service.py
│   │   ├── auth_service.py
│   │   ├── clustering_service.py
│   │   ├── ml_scheduler.py
│   │   ├── ml_service.py
│   │   ├── ocr_service.py
│   │   └── patient_service.py
│   │
│   └── utils/
│       └── security.py
│
├── datasets/
│   └── health_risk_dataset.csv
│
├── ml_models/
│   └── health_risk_model.joblib
│
└── uploads/
    ├── 7d50707d77d34af3a7253cfb571df7d2.png
    └── d00d3a323e69438c959640c1e6c3adf9.png
```

### Important Files and Directories

- `app/main.py` — Creates the FastAPI application, registers routers, configures CORS, initializes database metadata and runtime schema setup, and starts the ML scheduler through the application lifespan.
- `app/config.py` — Loads environment variables and defines database, JWT, CORS, and scheduler settings.
- `app/database.py` — Configures database connectivity, SQLAlchemy, and database helpers.
- `app/models.py` — Defines core application models such as users, patients, health records, medical reports, and risk predictions.
- `app/hms_models.py` — Defines hospital-management data models.
- `app/schemas.py` — Defines request and response schemas used by the API.
- `app/routers/` — Contains the API endpoints grouped by functional area.
- `app/services/` — Contains authentication, access-control, patient, OCR, ML, clustering, scheduling, and analytics logic.
- `app/utils/security.py` — Contains shared security helpers.
- `datasets/health_risk_dataset.csv` — Dataset file included in the repository.
- `ml_models/health_risk_model.joblib` — Serialized ML model file.
- `uploads/` — Local report-upload storage included in the repository snapshot.
- `.env.example` — Template for the application's environment variables.
- `requirements.txt` — Python dependency list.

## System Architecture

The backend follows a modular structure in which API routing, business logic, database access, and model processing are separated.

```text
Client / API Consumer
        |
        v
FastAPI Application
        |
        ├── Authentication and Access Control
        |
        ├── Patient and Medical Report APIs
        |
        ├── OCR and Report Processing
        |
        ├── ML Prediction and Training
        |
        ├── Clustering and Analytics
        |
        ├── AI Healthcare Assistant
        |
        └── Hospital Management APIs
                    |
                    v
             Service Layer
                    |
          ┌─────────┴─────────┐
          v                   v
     PostgreSQL          ML / OCR / AI
```

This diagram represents the main application components, not a deployment diagram or a guarantee that every external provider is available at all times.

## Installation and Setup

### Prerequisites

Install the following before running the project:

- Python compatible with the project's installed dependencies.
- PostgreSQL database and a valid connection URL.
- Git, if cloning the repository.
- Tesseract OCR for image-based OCR processing.
- Valid AI-provider API keys if using the AI assistant.

The repository's `requirements.txt` lists the Python dependencies.

### 1. Clone the Repository

```bash
git clone https://github.com/abhi04110/AI-Healthcare.git
cd AI-Healthcare
```

If you already have the source code downloaded, open a terminal in the project root—the directory containing `app/` and `requirements.txt`.

### 2. Create a Virtual Environment

On Windows PowerShell:

```powershell
python -m venv env
.\env\Scripts\Activate.ps1
```

If PowerShell blocks activation because of its execution policy, follow your organization's policy or use the appropriate activation method for your environment.

### 3. Install Dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure PostgreSQL

Create or select a PostgreSQL database, then obtain its connection URL.

Example format:

```text
postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

Replace the placeholders with the actual database credentials and details. URL-encode special characters in credentials when necessary.

### 5. Create the Environment File

Copy `.env.example` to `.env` in the project root.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder values with your actual configuration.

**Do not commit `.env` or publish API keys, database passwords, or production secrets.**

### 6. Install Tesseract OCR

Image-based OCR requires the Tesseract executable in addition to the Python package.

On Windows, install Tesseract OCR and verify that the executable is available.

```powershell
tesseract --version
```

The current `app/services/ocr_service.py` contains this Windows executable path:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

The service uses that path if the executable exists there. If Tesseract is installed elsewhere, update the path in the service or configure it appropriately for your environment.

PDF text extraction uses PyPDF. Image-based OCR uses Tesseract through Pytesseract.

## Environment Configuration

The repository's `.env.example` contains the following variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET_KEY` | Secret used for JWT signing |
| `JWT_ALGORITHM` | JWT signing algorithm; example uses `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime in minutes |
| `ML_RETRAIN_INTERVAL_HOURS` | Interval configured for scheduled ML retraining |
| `GROQ_API_KEY` | API key for Groq integration |
| `GROQ_MODEL` | Model identifier for Groq |
| `GEMINI_API_KEY` | API key for Google Gemini integration |
| `GEMINI_MODEL` | Model identifier for Gemini |
| `FRONTEND_URL` | Allowed CORS origin configured for the application |

Example template:

```dotenv
DATABASE_URL=your_database_url_here

JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

ML_RETRAIN_INTERVAL_HOURS=24

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash

FRONTEND_URL=http://localhost:5173
```

Use the values from your actual `.env.example` as the starting point. Model identifiers can change or become unavailable, so confirm that the configured provider supports the model you choose.

### Configuration Notes

- `DATABASE_URL` is required by `app/config.py`; the application raises an error if it is missing.
- Keep `JWT_SECRET_KEY` private and use a strong random value outside local development.
- `FRONTEND_URL` controls the configured CORS origin. It does not mean a frontend application is included in this repository.
- AI integrations require valid provider configuration to work.
- The Tesseract executable must be installed separately from Python dependencies.

## Running the Application

From the project root, with the virtual environment activated and `.env` configured, run:

```powershell
uvicorn app.main:app --reload --port 8000
```

When startup succeeds, the API should be available at:

```text
http://127.0.0.1:8000
```

### Interactive API Documentation

FastAPI provides interactive documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

These pages allow you to inspect available endpoints, view request schemas, and try supported API operations.

### Basic Health Checks

The application defines these utility routes:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Returns an application-running message |
| `GET` | `/health` | Returns a basic health status |
| `GET` | `/database-check` | Checks the database connection; requires admin access |
| `GET` | `/tables` | Lists public-schema database tables; requires admin access |

A successful `/health` response alone does not prove that PostgreSQL, OCR, the ML model, or external AI services are all working.

## API Documentation

The API routes are registered through `app/main.py`. The application exposes functional groups for authentication, patient records, medical reports, OCR, prediction, clustering, analytics, the AI assistant, and hospital management.

Use `/docs` to inspect the precise request fields, response models, required authentication, and available operations for the version you are running.

### API Module Reference

| Module | Router prefix | Responsibility |
|---|---|---|
| Authentication | `/auth` | Registration, login, user profile, and user administration |
| Patients | `/patients` | Patient profiles and related health-record operations |
| Medical Reports | `/reports` | Report upload, retrieval, and deletion |
| OCR | `/ocr` | Medical document text extraction and processing |
| ML Prediction | `/prediction` | Model status, risk prediction, training-related operations, and history |
| Patient Clustering | `/clustering` | K-Means, DBSCAN, and hierarchical clustering |
| Healthcare Analytics | `/analytics` | Summary statistics, risk distribution, and outlier analysis |
| AI Healthcare Assistant | `/assistant` | Natural-language healthcare questions |
| Public Hospital Portal | `/public` | Doctor discovery, availability, bookings, and patient portal operations |
| HMS Departments | `/hms/departments` | Department operations |
| HMS Staff | `/hms/staff` | Staff-management operations |
| HMS Assignments | `/hms/assignments` | Patient assignment operations |
| HMS Appointments | `/hms/appointments` | Appointment management |
| HMS Consultations | `/hms/consultations` | Consultation operations |
| HMS Prescriptions | `/hms/prescriptions` | Prescription operations |
| HMS Laboratory | `/hms/labs` | Lab orders and results |
| HMS Pharmacy | `/hms/pharmacy` | Medicines, stock, and dispensing |
| HMS Billing | `/hms/billing` | Bills, bill items, and payments |
| HMS Emergency | `/hms/emergency` | Emergency-case operations |
| HMS ICU | `/hms/icu` | ICU admission operations |
| HMS Operation Theatre | `/hms/ot` | Operation-theatre case operations |
| HMS Housekeeping | `/hms/housekeeping` | Housekeeping tasks |
| HMS Canteen | `/hms/canteen` | Menu and order operations |
| HMS Dashboard | `/hms/dashboard` | Hospital dashboard information |

The module names above reflect the router prefixes defined in the code. Individual endpoints, HTTP methods, query parameters, and request schemas are documented by FastAPI's interactive documentation.

### Authentication

The authentication router is registered under:

```text
/auth
```

Its implemented operations include:

- `POST /auth/register` — Register a user.
- `POST /auth/login` — Authenticate a user and obtain a token.
- `POST /auth/users` — Create a user through the admin-protected operation.
- `GET /auth/me` — Retrieve the current authenticated user's profile.

Login uses form-based credentials in the current implementation. After obtaining a token, use the authorization mechanism shown in Swagger UI for protected endpoints.

### Prediction API Examples

The prediction router includes the following routes:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/prediction/model-status` | Inspect saved model status |
| `POST` | `/prediction/risk` | Predict risk from supplied health measurements |
| `POST` | `/prediction/patient/{patient_id}` | Predict risk for a patient |
| `GET` | `/prediction/patient/{patient_id}/history` | Retrieve a patient's prediction history |
| `GET` | `/prediction/history` | Retrieve prediction history subject to access rules |

The source also defines training-related routes that are hidden from the generated OpenAPI schema. Consult the code and runtime configuration before calling those routes directly.

### Analytics API

The analytics router defines:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/analytics/summary` | Healthcare summary statistics |
| `GET` | `/analytics/risk-distribution` | Risk-category distribution |
| `GET` | `/analytics/outliers` | Statistical outlier analysis |

### Clustering API

The clustering router defines these operations:

| Method | Endpoint | Algorithm |
|---|---|---|
| `POST` | `/clustering/kmeans` | K-Means |
| `POST` | `/clustering/dbscan` | DBSCAN |
| `POST` | `/clustering/hierarchical` | Hierarchical clustering |

### AI Assistant API

The assistant router is registered under:

```text
/assistant
```

Its main question-answering endpoint is:

```text
POST /assistant/ask
```

Inspect `/docs` for the exact request body, available provider options, and response format.

### Public Portal API

The public portal is registered under:

```text
/public
```

Its route definitions include doctor listing, availability, appointment booking, existing-patient booking, patient profile operations, appointment cancellation, prescriptions, bills, laboratory information, and patient records.

Some patient-specific operations require appropriate portal authentication or access credentials. Check the endpoint dependencies in `/docs` and the router implementation.

## Machine Learning Workflow

The ML service is implemented in `app/services/ml_service.py`.

### Training Data

The training service reads labelled health records from PostgreSQL. Records must contain the features required by the model and a valid risk label.

The expected risk labels are:

- `low`
- `medium`
- `high`

The training implementation requires at least 10 complete labelled records, at least two different classes, and at least two records per class.

### Training Process

1. Retrieve complete labelled health records.
2. Validate the risk labels and available data.
3. Select the six model features.
4. Split data into training and testing sets.
5. Fit a Random Forest Classifier.
6. Evaluate the model on the test split.
7. Save the serialized model.
8. Write training metadata, including the evaluation metrics.

The serialized model is stored at:

```text
ml_models/health_risk_model.joblib
```

Training metadata is written to:

```text
ml_models/health_risk_model_metadata.json
```

The metadata file is created by the training service and may not exist until training has run.

### Prediction Process

For direct predictions, the ML service loads the saved model and prepares the required numerical features. It then returns the predicted class and associated probability information.

A patient-based prediction uses the corresponding patient's available health record data. The exact validation requirements and error responses are defined in the prediction router and ML service.

### Scheduled Training

The application starts `ml_training_scheduler()` as part of its FastAPI lifespan. The configured `ML_RETRAIN_INTERVAL_HOURS` value controls the scheduled interval.

For meaningful evaluation, the dataset should contain representative, correctly labelled records. A high score on a small or synthetic dataset does not establish real-world clinical accuracy.

## OCR Workflow

OCR functionality is implemented in `app/services/ocr_service.py` and exposed through the OCR and report routers.

### Image-Based Documents

For PNG, JPG, and JPEG files, the service:

1. Opens the image with Pillow.
2. Passes the image to Tesseract through Pytesseract.
3. Returns the extracted text.

### PDF Documents

For PDF files, the service:

1. Opens the document with PyPDF.
2. Iterates over its pages.
3. Extracts available embedded text.
4. Combines the extracted page text into a result.

**Important:** The current PDF implementation extracts embedded text; it does not render scanned PDF pages into images for OCR. A scanned PDF without an embedded text layer may therefore return little or no text.

OCR accuracy depends on image quality, document layout, scan quality, and the contents of the report.

## Database Design

The application uses SQLAlchemy models and PostgreSQL.

### Core Models

The core model file, `app/models.py`, defines:

- `User`
- `Patient`
- `HealthRecord`
- `MedicalReport`
- `RiskPrediction`

### Hospital Management Models

The hospital model file, `app/hms_models.py`, defines entities for:

- Departments
- Staff profiles
- Patient-doctor assignments
- Appointments
- Consultations
- Prescriptions
- Laboratory orders and results
- Medicines and medicine dispensing
- Bills and bill items
- Emergency cases
- ICU admissions
- Operation-theatre cases
- Housekeeping tasks
- Canteen menu items and orders

### Schema Initialization

The application invokes SQLAlchemy metadata creation and a runtime-schema helper during startup.

The database must be reachable, the configured user must have appropriate permissions, and the database schema must be compatible with the code. For production use, a controlled migration process is preferable to relying only on automatic table creation.

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
- Do not commit database credentials or API keys.
- Use HTTPS and appropriate infrastructure protections in deployed environments.
- Apply least-privilege permissions to the PostgreSQL user.
- Restrict access to medical documents and uploaded files.
- Validate user permissions before exposing patient information.
- Review logs and error responses to avoid disclosing sensitive data.
- Use synthetic or properly de-identified data for demonstrations and development.

## Troubleshooting

### Application reports that `DATABASE_URL` is missing

Check that:

- `.env` exists in the project root.
- The variable is named `DATABASE_URL`.
- The value contains a valid PostgreSQL connection URL.
- The application is started from the correct project directory.

### PostgreSQL connection fails

Verify the database service is running, the host and port are correct, the database exists, and the credentials are valid. Also confirm that the database accepts connections from your environment.

### Tesseract executable is not found

Install Tesseract OCR and check its executable path. The current OCR service checks `C:\Program Files\Tesseract-OCR\tesseract.exe`; update this setting if your installation uses a different path.

### The ML model is not ready

Check `/prediction/model-status` and confirm that the model file exists. If retraining is needed, ensure PostgreSQL contains enough complete, labelled health records and that the labels are valid.

### AI assistant requests fail

Verify the relevant API key and model identifier in `.env`. Confirm that the provider is accessible and that the selected model is supported by the provider account.

### Swagger shows authorization or validation errors

Review the endpoint's security requirements and request schema in `/docs`. For protected endpoints, authenticate first and provide the required token using the supported authorization flow.

## Limitations and Disclaimer

- This repository is a backend application; a frontend application is not included in the listed project structure.
- OCR results may contain recognition errors and require verification.
- Machine learning predictions depend on training-data quality, coverage, and model performance.
- Demo or synthetic labels should not be treated as clinically validated ground truth.
- Statistical outliers and clustering results are analytical indicators, not diagnoses.
- Availability of Gemini, Groq, PostgreSQL, and OCR processing depends on correct configuration and service availability.
- A successful local run does not by itself establish production readiness, regulatory compliance, or clinical validation.

**This system is intended for software development, healthcare data analysis, and decision-support experimentation. It is not a substitute for professional medical judgment, diagnosis, or treatment.**

## Future Improvements

Potential future enhancements include:

- Automated tests and continuous integration.
- Database migration management.
- More robust OCR preprocessing and scanned-PDF handling.
- Model evaluation on larger, clinically validated datasets.
- Centralized audit logging and monitoring.
- Deployment hardening, secure file storage, and backup procedures.
- Expanded observability for ML training and external AI integrations.

## Author

**Abhishek Kumar**

GitHub: [@abhi04110](https://github.com/abhi04110)

Repository: [AI-Healthcare](https://github.com/abhi04110/AI-Healthcare)