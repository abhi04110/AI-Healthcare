import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, MedicalReport
from app.routers.auth import get_current_user
from app.routers.patients import get_patient_service


router = APIRouter(
    prefix="/ocr",
    tags=["OCR"]
)


MEDICAL_FIELDS = {
    "hemoglobin": [
        "Hemoglobin"
    ],
    "wbc_count": [
        "WBC Count",
        "WBC"
    ],
    "rbc_count": [
        "RBC Count",
        "RBC"
    ],
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
    "albumin": [
        "Albumin"
    ],
    "creatinine": [
        "Creatinine"
    ],
    "urea": [
        "Urea"
    ],
    "uric_acid": [
        "Uric Acid"
    ],
    "tsh": [
        "TSH"
    ]
}


def extract_numeric_value(
    text: str,
    labels: list[str]
):
    for label in labels:

        pattern = (
            rf"{re.escape(label)}"
            r"\s*:\s*"
            r"([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)"
        )

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            value = match.group(1)

            value = value.replace(
                ",",
                ""
            )

            return float(value)

    return None


def extract_medical_values(
    extracted_text: str
):
    result = {}

    for field, labels in MEDICAL_FIELDS.items():

        value = extract_numeric_value(
            extracted_text,
            labels
        )

        result[field] = value

    return result


@router.get(
    "/report/{report_id}/values"
)
def extract_report_values(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    report = db.query(
        MedicalReport
    ).filter(
        MedicalReport.id == report_id
    ).first()

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