from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.hms_models import (
    Consultation,
    Appointment,
    PatientDoctorAssignment
)
from app.schemas import ConsultationCreate
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/consultations",
    tags=["HMS Consultations"]
)


@router.post("/", status_code=201)
def create_consultation(
    data: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can create consultations"
        )

    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == data.appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if appointment.doctor_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="This appointment does not belong to you"
        )

    assignment = (
        db.query(PatientDoctorAssignment)
        .filter(
            PatientDoctorAssignment.patient_id == appointment.patient_id,
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

    existing = (
        db.query(Consultation)
        .filter(
            Consultation.appointment_id == data.appointment_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Consultation already exists for this appointment"
        )

    consultation = Consultation(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_user_id=current_user.id,
        symptoms=data.symptoms,
        diagnosis=data.diagnosis,
        treatment_plan=data.treatment_plan,
        follow_up_date=data.follow_up_date,
        notes=data.notes
    )

    db.add(consultation)

    appointment.status = "completed"

    db.commit()
    db.refresh(consultation)

    return consultation


@router.get("/my")
def get_my_consultations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can access this endpoint"
        )

    consultations = (
        db.query(Consultation)
        .filter(
            Consultation.doctor_user_id == current_user.id
        )
        .order_by(Consultation.created_at.desc())
        .all()
    )

    return consultations


@router.get("/patient/{patient_id}")
def get_patient_consultations(
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

    consultations = (
        db.query(Consultation)
        .filter(
            Consultation.patient_id == patient_id
        )
        .order_by(Consultation.created_at.desc())
        .all()
    )

    return consultations