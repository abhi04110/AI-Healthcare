from sqlalchemy.orm import Session

from app.models import Patient, User
from app.hms_models import PatientDoctorAssignment


def get_accessible_patient_query(db: Session, current_user: User):
    query = db.query(Patient)

    if current_user.role == "admin":
        return query

    if current_user.role == "doctor":
        return (
            query
            .join(
                PatientDoctorAssignment,
                PatientDoctorAssignment.patient_id == Patient.id,
            )
            .filter(
                PatientDoctorAssignment.doctor_user_id == current_user.id,
                PatientDoctorAssignment.is_active.is_(True),
            )
            .distinct()
        )

    if current_user.role == "patient":
        return query.filter(Patient.user_id == current_user.id)

    return query.filter(Patient.created_by == current_user.id)


def get_accessible_patient_ids(db: Session, current_user: User) -> list[int]:
    return [
        patient_id
        for (patient_id,) in get_accessible_patient_query(
            db, current_user
        ).with_entities(Patient.id).all()
    ]


def get_accessible_patient(
    db: Session,
    current_user: User,
    patient_id: int,
):
    return (
        get_accessible_patient_query(db, current_user)
        .filter(Patient.id == patient_id)
        .first()
    )
