from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine, Base
from app import models

from app.routers import auth, patients


Base.metadata.create_all(
    bind=engine
)


app = FastAPI(
    title="AI Healthcare Risk & Patient Analytics System",
    description="""
    An intelligent healthcare system for:

    - Authentication
    - Patient Management
    - Health Risk Prediction
    - Medical Report OCR
    - Patient Clustering
    - Healthcare Analytics
    - AI Assistant
    """,
    version="1.0.0"
)


app.include_router(
    auth.router
)

app.include_router(
    patients.router
)


@app.get("/")
def home():

    return {
        "message": "AI Healthcare Risk & Patient Analytics System is running successfully",
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

            connection.execute(
                text("SELECT 1")
            )

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

            tables = [
                row[0]
                for row in result
            ]

        return {
            "status": "success",
            "tables": tables
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }