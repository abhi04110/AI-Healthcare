
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base, ensure_runtime_schema
from app.config import FRONTEND_URL
from app import models, hms_models

from app.services.ml_scheduler import ml_training_scheduler
from app.services.rag_scheduler import rag_daily_scheduler
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
    hms_dashboard_router,
)

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)
ensure_runtime_schema()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_task = asyncio.create_task(ml_training_scheduler())
    rag_task = asyncio.create_task(rag_daily_scheduler())

    try:
        yield
    finally:
        tasks = [ml_task, rag_task]

        for task in tasks:
            task.cancel()

        await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(
    title="AI Healthcare & Hospital Management System",
    description="""
Hospital Management System with:
- Authentication and role-based access
- Department and staff management
- Patient management
- Medical reports and OCR
- AI health risk prediction
- Patient clustering
- Healthcare analytics
- AI healthcare assistant with medical knowledge RAG
""",
    version="3.1.0",
    lifespan=lifespan,
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
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/database-check")
def database_check(current_user=Depends(require_admin)):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "success",
            "message": "PostgreSQL database connected successfully",
        }

    except Exception:
        logger.exception("Database connectivity check failed")
        return {
            "status": "error",
            "message": "Database connection failed. Check backend logs.",
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

        return {"status": "success", "tables": tables}

    except Exception:
        logger.exception("Could not list database tables")
        return {
            "status": "error",
            "message": "Could not list database tables. Check backend logs.",
            }