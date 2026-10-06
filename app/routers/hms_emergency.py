from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import EmergencyCase, StaffProfile
from app.schemas import (
    EmergencyCaseCreate,
    EmergencyStatusUpdate
)
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/emergency",
    tags=["HMS Emergency"]
)


@router.post("/", status_code=201)
def create_emergency_case(
    data: EmergencyCaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed_roles = {
        "admin",
        "department_admin",
        "doctor",
        "nurse",
        "receptionist"
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create emergency cases"
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

    allowed_priorities = {
        "critical",
        "urgent",
        "normal"
    }

    if data.priority not in allowed_priorities:
        raise HTTPException(
            status_code=400,
            detail="Priority must be critical, urgent, or normal"
        )

    if data.assigned_doctor_id:
        doctor = (
            db.query(User)
            .filter(
                User.id == data.assigned_doctor_id,
                User.role == "doctor"
            )
            .first()
        )

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Assigned doctor not found"
            )

    if data.assigned_nurse_id:
        nurse = (
            db.query(User)
            .filter(
                User.id == data.assigned_nurse_id,
                User.role == "nurse"
            )
            .first()
        )

        if not nurse:
            raise HTTPException(
                status_code=404,
                detail="Assigned nurse not found"
            )

    emergency = EmergencyCase(
        patient_id=data.patient_id,
        assigned_doctor_id=data.assigned_doctor_id,
        assigned_nurse_id=data.assigned_nurse_id,
        priority=data.priority,
        symptoms=data.symptoms,
        vitals=data.vitals,
        treatment_notes=data.treatment_notes,
        admission_required=data.admission_required,
        status="waiting",
        created_by_user_id=current_user.id
    )

    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    return emergency


@router.get("/")
def get_emergency_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        return (
            db.query(EmergencyCase)
            .order_by(EmergencyCase.created_at.desc())
            .all()
        )

    if current_user.role == "doctor":
        return (
            db.query(EmergencyCase)
            .filter(
                EmergencyCase.assigned_doctor_id == current_user.id
            )
            .order_by(EmergencyCase.created_at.desc())
            .all()
        )

    if current_user.role == "nurse":
        return (
            db.query(EmergencyCase)
            .filter(
                EmergencyCase.assigned_nurse_id == current_user.id
            )
            .order_by(EmergencyCase.created_at.desc())
            .all()
        )

    return (
        db.query(EmergencyCase)
        .filter(
            EmergencyCase.created_by_user_id == current_user.id
        )
        .order_by(EmergencyCase.created_at.desc())
        .all()
    )


@router.get("/{case_id}")
def get_emergency_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emergency = (
        db.query(EmergencyCase)
        .filter(EmergencyCase.id == case_id)
        .first()
    )

    if not emergency:
        raise HTTPException(
            status_code=404,
            detail="Emergency case not found"
        )

    if current_user.role == "admin":
        return emergency

    if current_user.role == "doctor":
        if emergency.assigned_doctor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this emergency case"
            )
        return emergency

    if current_user.role == "nurse":
        if emergency.assigned_nurse_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this emergency case"
            )
        return emergency

    if emergency.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    return emergency


@router.patch("/{case_id}/status")
def update_emergency_status(
    case_id: int,
    data: EmergencyStatusUpdate,
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

    emergency = (
        db.query(EmergencyCase)
        .filter(EmergencyCase.id == case_id)
        .first()
    )

    if not emergency:
        raise HTTPException(
            status_code=404,
            detail="Emergency case not found"
        )

    allowed_statuses = {
        "waiting",
        "in_treatment",
        "admitted",
        "discharged",
        "cancelled"
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid emergency status"
        )

    if current_user.role == "doctor":
        if emergency.assigned_doctor_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this emergency case"
            )

    if current_user.role == "nurse":
        if emergency.assigned_nurse_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this emergency case"
            )

    emergency.status = data.status

    if data.treatment_notes is not None:
        emergency.treatment_notes = data.treatment_notes

    if data.admission_required is not None:
        emergency.admission_required = data.admission_required

    db.commit()
    db.refresh(emergency)

    return emergency