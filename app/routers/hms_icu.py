from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import ICUAdmission
from app.schemas import (
    ICUAdmissionCreate,
    ICUStatusUpdate
)
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/icu",
    tags=["HMS ICU"]
)


@router.post("/", status_code=201)
def create_icu_admission(
    data: ICUAdmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "doctor",
        "department_admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to admit patients to ICU"
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == data.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    existing_bed = (
        db.query(ICUAdmission)
        .filter(
            ICUAdmission.bed_number == data.bed_number,
            ICUAdmission.status == "admitted"
        )
        .first()
    )

    if existing_bed:
        raise HTTPException(
            status_code=409,
            detail="ICU bed is already occupied"
        )

    if data.doctor_user_id:
        doctor = (
            db.query(User)
            .filter(
                User.id == data.doctor_user_id,
                User.role == "doctor"
            )
            .first()
        )

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found"
            )

    if data.nurse_user_id:
        nurse = (
            db.query(User)
            .filter(
                User.id == data.nurse_user_id,
                User.role == "nurse"
            )
            .first()
        )

        if not nurse:
            raise HTTPException(
                status_code=404,
                detail="Nurse not found"
            )

    admission = ICUAdmission(
        patient_id=data.patient_id,
        doctor_user_id=data.doctor_user_id,
        nurse_user_id=data.nurse_user_id,
        bed_number=data.bed_number,
        room_number=data.room_number,
        admission_reason=data.admission_reason,
        vitals=data.vitals,
        treatment_notes=data.treatment_notes,
        status="admitted",
        created_by_user_id=current_user.id
    )

    db.add(admission)
    db.commit()
    db.refresh(admission)

    return admission


@router.get("/")
def get_icu_admissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        return (
            db.query(ICUAdmission)
            .order_by(ICUAdmission.created_at.desc())
            .all()
        )

    if current_user.role == "doctor":
        return (
            db.query(ICUAdmission)
            .filter(ICUAdmission.doctor_user_id == current_user.id)
            .order_by(ICUAdmission.created_at.desc())
            .all()
        )

    if current_user.role == "nurse":
        return (
            db.query(ICUAdmission)
            .filter(ICUAdmission.nurse_user_id == current_user.id)
            .order_by(ICUAdmission.created_at.desc())
            .all()
        )

    return (
        db.query(ICUAdmission)
        .filter(ICUAdmission.created_by_user_id == current_user.id)
        .order_by(ICUAdmission.created_at.desc())
        .all()
    )


@router.get("/{admission_id}")
def get_icu_admission(
    admission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    admission = (
        db.query(ICUAdmission)
        .filter(ICUAdmission.id == admission_id)
        .first()
    )

    if not admission:
        raise HTTPException(
            status_code=404,
            detail="ICU admission not found"
        )

    if current_user.role == "admin":
        return admission

    if current_user.role == "doctor":
        if admission.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this ICU patient"
            )
        return admission

    if current_user.role == "nurse":
        if admission.nurse_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this ICU patient"
            )
        return admission

    if admission.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    return admission


@router.patch("/{admission_id}/status")
def update_icu_status(
    admission_id: int,
    data: ICUStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "doctor",
        "nurse"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    admission = (
        db.query(ICUAdmission)
        .filter(ICUAdmission.id == admission_id)
        .first()
    )

    if not admission:
        raise HTTPException(
            status_code=404,
            detail="ICU admission not found"
        )

    if current_user.role == "doctor":
        if admission.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this ICU patient"
            )

    if current_user.role == "nurse":
        if admission.nurse_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this ICU patient"
            )

    allowed_statuses = {
        "admitted",
        "critical",
        "stable",
        "discharged"
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid ICU status"
        )

    admission.status = data.status

    if data.vitals is not None:
        admission.vitals = data.vitals

    if data.treatment_notes is not None:
        admission.treatment_notes = data.treatment_notes

    if data.status == "discharged":
        admission.discharged_at = datetime.utcnow()

    db.commit()
    db.refresh(admission)

    return admission