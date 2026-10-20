from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base, ensure_runtime_schema
from app.config import FRONTEND_URL
from app import models, hms_models

from app.services.ml_scheduler import ml_training_scheduler

from app.routers.auth import require_admin

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
    hms_ot,
    hms_housekeeping,
    hms_canteen,
    hms_dashboard_router
)


Base.metadata.create_all(bind=engine)
ensure_runtime_schema()


@asynccontextmanager
async def lifespan(app: FastAPI):
    training_task = asyncio.create_task(ml_training_scheduler())
    try:
        yield
    finally:
        training_task.cancel()
        try:
            await training_task
        except asyncio.CancelledError:
            pass


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
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
from app.routers import public_portal
app.include_router(public_portal.router)
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
app.include_router(hms_housekeeping.router)
app.include_router(hms_canteen.router)
app.include_router(hms_dashboard_router)

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
def database_check(current_user=Depends(require_admin)):

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
def get_tables(current_user=Depends(require_admin)):

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