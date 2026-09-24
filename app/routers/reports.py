import os
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models import (
    User,
    MedicalReport
)

from app.schemas import (
    MedicalReportResponse
)

from app.routers.auth import get_current_user

from app.routers.patients import get_patient_service

from app.services.ocr_service import (
    extract_text_from_file
)


router = APIRouter(
    prefix="/reports",
    tags=["Medical Reports"]
)


UPLOAD_DIR = "uploads"

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png"
}

MAX_FILE_SIZE = 10 * 1024 * 1024


os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


@router.post(
    "/{patient_id}/upload",
    response_model=MedicalReportResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_medical_report(
    patient_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is missing"
        )

    original_extension = os.path.splitext(
        file.filename
    )[1].lower()

    if original_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, JPG, JPEG, and PNG files are allowed"
        )

    file_content = await file.read()

    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size must be less than 10 MB"
        )

    unique_filename = (
        f"{uuid4().hex}{original_extension}"
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        unique_filename
    )

    try:
        with open(
            file_path,
            "wb"
        ) as output_file:
            output_file.write(
                file_content
            )

        file_type = original_extension.lstrip(
            "."
        )

        extracted_text = extract_text_from_file(
            file_path=file_path,
            file_type=file_type
        )

        report = MedicalReport(
            patient_id=patient_id,
            file_name=file.filename,
            file_path=file_path,
            file_type=file_type,
            extracted_text=extracted_text
        )

        db.add(report)
        db.commit()
        db.refresh(report)

        return report

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report processing failed: {str(e)}"
        )


@router.get(
    "/{patient_id}",
    response_model=list[MedicalReportResponse]
)
def get_patient_reports(
    patient_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    reports = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.patient_id == patient_id
        )
        .order_by(
            MedicalReport.created_at.desc(),
            MedicalReport.id.desc()
        )
        .all()
    )

    return reports


@router.get(
    "/{patient_id}/latest",
    response_model=MedicalReportResponse
)
def get_latest_patient_report(
    patient_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    report = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.patient_id == patient_id
        )
        .order_by(
            MedicalReport.created_at.desc(),
            MedicalReport.id.desc()
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No medical report found for this patient"
        )

    return report


@router.delete(
    "/{patient_id}/latest"
)
def delete_latest_patient_report(
    patient_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    report = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.patient_id == patient_id
        )
        .order_by(
            MedicalReport.created_at.desc(),
            MedicalReport.id.desc()
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No medical report found for this patient"
        )

    if os.path.exists(report.file_path):
        os.remove(report.file_path)

    db.delete(report)
    db.commit()

    return {
        "message": "Latest medical report deleted successfully",
        "patient_id": patient_id
    }