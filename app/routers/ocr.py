import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models import (
    User,
    MedicalReport,
    HealthRecord
)

from app.routers.auth import get_current_user
from app.routers.patients import get_patient_service


router = APIRouter(
    prefix="/ocr",
    tags=["OCR"]
)


MEDICAL_FIELDS = {
    "hemoglobin": ["Hemoglobin"],
    "wbc_count": ["WBC Count", "WBC"],
    "rbc_count": ["RBC Count", "RBC"],
    "platelet_count": [
        "Platelet Count",
        "Platelets"
    ],
    "alt": [
        "ALT (SGPT)",
        "ALT"
    ],
    "ast": [
        "AST (SGOT)",
        "AST"
    ],
    "total_bilirubin": [
        "Total Bilirubin",
        "Bilirubin"
    ],
    "albumin": ["Albumin"],
    "creatinine": ["Creatinine"],
    "urea": ["Urea"],
    "uric_acid": ["Uric Acid"],
    "tsh": ["TSH"]
}


def extract_numeric_value(
    text: str,
    labels: list[str]
):
    for label in labels:

        pattern = (
            rf"{re.escape(label)}"
            r"\s*[:\-]?\s*"
            r"([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)"
        )

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            value = (
                match.group(1)
                .replace(",", "")
            )

            return float(value)

    return None


def extract_medical_values(
    extracted_text: str
):
    result = {}

    for field, labels in MEDICAL_FIELDS.items():
        result[field] = extract_numeric_value(
            extracted_text,
            labels
        )

    return result


@router.get(
    "/report/{report_id}/values"
)
def extract_report_values(
    report_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    report = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.id == report_id
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Medical report not found"
        )

    get_patient_service(
        patient_id=report.patient_id,
        current_user=current_user,
        db=db
    )

    if not report.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="No OCR text available for this report"
        )

    values = extract_medical_values(
        report.extracted_text
    )

    return {
        "report_id": report.id,
        "patient_id": report.patient_id,
        "values": values
    }


@router.post(
    "/report/{report_id}/create-health-record"
)
def create_health_record_from_ocr(
    report_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    report = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.id == report_id
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Medical report not found"
        )

    patient = get_patient_service(
        patient_id=report.patient_id,
        current_user=current_user,
        db=db
    )

    if not report.extracted_text:
        raise HTTPException(
            status_code=400,
            detail="No OCR text available"
        )

    values = extract_medical_values(
        report.extracted_text
    )

    glucose = values.get("glucose")
    blood_pressure = values.get(
        "blood_pressure"
    )
    bmi = values.get("bmi")
    cholesterol = values.get(
        "cholesterol"
    )
    heart_rate = values.get(
        "heart_rate"
    )

    available_values = {
        "glucose": glucose,
        "blood_pressure": blood_pressure,
        "bmi": bmi,
        "cholesterol": cholesterol,
        "heart_rate": heart_rate
    }

    available_count = sum(
        value is not None
        for value in available_values.values()
    )

    if available_count == 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "No supported health record values "
                "were detected in the OCR text"
            )
        )

    health_record = HealthRecord(
        patient_id=patient.id,
        glucose=glucose,
        blood_pressure=blood_pressure,
        bmi=bmi,
        cholesterol=cholesterol,
        heart_rate=heart_rate
    )

    db.add(health_record)
    db.commit()
    db.refresh(health_record)

    return {
        "status": "success",
        "message": (
            "Health record created from OCR data"
        ),
        "report_id": report.id,
        "patient_id": patient.id,
        "health_record": {
            "id": health_record.id,
            "glucose": health_record.glucose,
            "blood_pressure": (
                health_record.blood_pressure
            ),
            "bmi": health_record.bmi,
            "cholesterol": (
                health_record.cholesterol
            ),
            "heart_rate": (
                health_record.heart_rate
            ),
            "created_at": (
                health_record.created_at.isoformat()
                if health_record.created_at
                else None
            )
        },
        "detected_values": values,
        "note": (
            "OCR-extracted values should be "
            "reviewed by healthcare staff before "
            "clinical use."
        )
    }