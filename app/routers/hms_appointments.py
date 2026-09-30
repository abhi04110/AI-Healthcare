from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import StaffProfile, PatientDoctorAssignment, Appointment
from app.schemas import AppointmentCreate, AppointmentStatusUpdate
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/appointments",
    tags=["HMS Appointments"]
)


ALLOWED_STATUSES = {
    "scheduled",
    "completed",
    "cancelled",
    "no_show"
}


def get_staff_profile(
    user_id: int,
    db: Session
):
    return (
        db.query(StaffProfile)
        .filter(
            StaffProfile.user_id == user_id,
            StaffProfile.is_active == True
        )
        .first()
    )


def is_doctor_assigned_to_patient(
    doctor_user_id: int,
    patient_id: int,
    db: Session
):
    assignment = (
        db.query(PatientDoctorAssignment)
        .filter(
            PatientDoctorAssignment.doctor_user_id == doctor_user_id,
            PatientDoctorAssignment.patient_id == patient_id,
            PatientDoctorAssignment.is_active == True
        )
        .first()
    )

    return assignment is not None


def appointment_to_dict(appointment: Appointment):
    return {
        "id": appointment.id,
        "patient_id": appointment.patient_id,
        "patient_name": appointment.patient.name if appointment.patient else None,
        "doctor_user_id": appointment.doctor_user_id,
        "doctor_name": appointment.doctor.name if appointment.doctor else None,
        "doctor_email": appointment.doctor.email if appointment.doctor else None,
        "created_by_user_id": appointment.created_by_user_id,
        "appointment_date": appointment.appointment_date,
        "reason": appointment.reason,
        "status": appointment.status,
        "notes": appointment.notes,
        "is_active": appointment.is_active,
        "created_at": appointment.created_at,
        "updated_at": appointment.updated_at
    }


@router.post("/", status_code=201)
def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    allowed_creator_roles = {
        "admin",
        "department_admin",
        "receptionist"
    }

    if current_user.role not in allowed_creator_roles:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to create appointments"
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == appointment_data.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    doctor = (
        db.query(User)
        .filter(
            User.id == appointment_data.doctor_user_id,
            User.role == "doctor"
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    doctor_profile = get_staff_profile(
        doctor.id,
        db
    )

    if not doctor_profile:
        raise HTTPException(
            status_code=400,
            detail="Doctor does not have an active staff profile"
        )

    if not is_doctor_assigned_to_patient(
        doctor.id,
        patient.id,
        db
    ):
        raise HTTPException(
            status_code=400,
            detail="Doctor is not assigned to this patient"
        )

    appointment_date = appointment_data.appointment_date

    if appointment_date.tzinfo is None:
        appointment_date = appointment_date.replace(
            tzinfo=timezone.utc
        )

    existing = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_user_id == doctor.id,
            Appointment.appointment_date == appointment_date,
            Appointment.is_active == True,
            Appointment.status == "scheduled"
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Doctor already has an appointment at this date and time"
        )

    appointment = Appointment(
        patient_id=patient.id,
        doctor_user_id=doctor.id,
        created_by_user_id=current_user.id,
        appointment_date=appointment_date,
        reason=appointment_data.reason,
        notes=appointment_data.notes,
        status="scheduled",
        is_active=True
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment_to_dict(appointment)


@router.get("/")
def get_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role == "admin":
        appointments = (
            db.query(Appointment)
            .filter(Appointment.is_active == True)
            .order_by(Appointment.appointment_date)
            .all()
        )

    elif current_user.role == "doctor":

        appointments = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_user_id == current_user.id,
                Appointment.is_active == True
            )
            .order_by(Appointment.appointment_date)
            .all()
        )

    elif current_user.role in {
        "department_admin",
        "receptionist"
    }:

        appointments = (
            db.query(Appointment)
            .filter(Appointment.is_active == True)
            .order_by(Appointment.appointment_date)
            .all()
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view appointments"
        )

    return [
        appointment_to_dict(appointment)
        for appointment in appointments
    ]


@router.get("/doctor/my")
def get_my_doctor_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can access this endpoint"
        )

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_user_id == current_user.id,
            Appointment.is_active == True
        )
        .order_by(Appointment.appointment_date)
        .all()
    )

    return [
        appointment_to_dict(appointment)
        for appointment in appointments
    ]


@router.get("/patient/{patient_id}")
def get_patient_appointments(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if current_user.role == "admin":
        pass

    elif current_user.role == "doctor":

        if not is_doctor_assigned_to_patient(
            current_user.id,
            patient_id,
            db
        ):
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this patient"
            )

    elif current_user.role not in {
        "department_admin",
        "receptionist"
    }:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view patient appointments"
        )

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.is_active == True
        )
        .order_by(Appointment.appointment_date)
        .all()
    )

    return [
        appointment_to_dict(appointment)
        for appointment in appointments
    ]


@router.get("/{appointment_id}")
def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id,
            Appointment.is_active == True
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    if current_user.role == "admin":
        return appointment_to_dict(appointment)

    if current_user.role == "doctor":

        if appointment.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access this appointment"
            )

        return appointment_to_dict(appointment)

    if current_user.role in {
        "department_admin",
        "receptionist"
    }:
        return appointment_to_dict(appointment)

    raise HTTPException(
        status_code=403,
        detail="You are not authorized to access this appointment"
    )


@router.patch("/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    status_data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if status_data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(ALLOWED_STATUSES)}"
        )

    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id,
            Appointment.is_active == True
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    allowed_roles = {
        "admin",
        "doctor",
        "receptionist",
        "department_admin"
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update appointment status"
        )

    if current_user.role == "doctor":

        if appointment.doctor_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own appointments"
            )

    appointment.status = status_data.status

    if status_data.notes is not None:
        appointment.notes = status_data.notes

    if status_data.status == "cancelled":
        appointment.is_active = False

    appointment.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(appointment)

    return appointment_to_dict(appointment)