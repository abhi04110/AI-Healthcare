from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.hms_models import (
    Prescription,
    Consultation,
    PatientDoctorAssignment
)
from app.schemas import PrescriptionCreate
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/prescriptions",
    tags=["HMS Prescriptions"]
)


@router.post("/", status_code=201)
def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can create prescriptions"
        )

    consultation = (
        db.query(Consultation)
        .filter(
            Consultation.id == data.consultation_id
        )
        .first()
    )

    if not consultation:
        raise HTTPException(
            status_code=404,
            detail="Consultation not found"
        )

    if consultation.doctor_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="This consultation does not belong to you"
        )

    assignment = (
        db.query(PatientDoctorAssignment)
        .filter(
            PatientDoctorAssignment.patient_id == consultation.patient_id,
            PatientDoctorAssignment.doctor_user_id == current_user.id,
            PatientDoctorAssignment.is_active == True
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this patient"
        )

    prescription = Prescription(
        consultation_id=consultation.id,
        patient_id=consultation.patient_id,
        doctor_user_id=current_user.id,
        medicine_name=data.medicine_name,
        dosage=data.dosage,
        frequency=data.frequency,
        duration=data.duration,
        instructions=data.instructions
    )

    db.add(prescription)
    db.commit()
    db.refresh(prescription)

    return prescription


@router.get("/my")
def get_my_prescriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can access this endpoint"
        )

    return (
        db.query(Prescription)
        .filter(
            Prescription.doctor_user_id == current_user.id
        )
        .order_by(Prescription.created_at.desc())
        .all()
    )


@router.get("/patient/{patient_id}")
def get_patient_prescriptions(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role == "doctor":

        assignment = (
            db.query(PatientDoctorAssignment)
            .filter(
                PatientDoctorAssignment.patient_id == patient_id,
                PatientDoctorAssignment.doctor_user_id == current_user.id,
                PatientDoctorAssignment.is_active == True
            )
            .first()
        )

        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this patient"
            )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    return (
        db.query(Prescription)
        .filter(
            Prescription.patient_id == patient_id
        )
        .order_by(Prescription.created_at.desc())
        .all()
    )