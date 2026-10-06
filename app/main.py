from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine, Base
from app import models, hms_models

from app.routers import (
    auth,
    patients,
    reports,
    ocr,
    prediction,
    clustering,
    analytics,
    assistant,
    hms_departments,
    hms_staff,
    hms_assignments,
    hms_appointments,
    hms_consultations,
    hms_prescriptions,
    hms_labs,
    hms_pharmacy,
    hms_billing,
    hms_emergency,
    hms_icu,
    hms_ot
)


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Healthcare & Hospital Management System",
    description="""
    Hospital Management System with:

    - Authentication and role-based access
    - Department Management
    - Patient Management
    - Medical Reports and OCR
    - AI Health Risk Prediction
    - Patient Clustering
    - Healthcare Analytics
    - AI Healthcare Assistant
    """,
    version="2.0.0"
)


app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(reports.router)
app.include_router(ocr.router)
app.include_router(prediction.router)
app.include_router(clustering.router)
app.include_router(analytics.router)
app.include_router(assistant.router)
app.include_router(hms_departments.router)
app.include_router(hms_staff.router)
app.include_router(hms_assignments.router)
app.include_router(hms_appointments.router)
app.include_router(hms_consultations.router)
app.include_router(hms_prescriptions.router)
app.include_router(hms_labs.router)
app.include_router(hms_pharmacy.router)
app.include_router(hms_billing.router)
app.include_router(hms_emergency.router)
app.include_router(hms_icu.router)
app.include_router(hms_ot.router)

@app.get("/")
def home():
    return {
        "message": "AI Healthcare and Hospital Management System is running",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/database-check")
def database_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "success",
            "message": "PostgreSQL database connected successfully"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@app.get("/tables")
def get_tables():
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
            )

            tables = [row[0] for row in result]

        return {
            "status": "success",
            "tables": tables
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }