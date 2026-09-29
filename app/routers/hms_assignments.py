from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import (
    Department,
    StaffProfile,
    PatientDoctorAssignment
)
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/assignments",
    tags=["HMS - Patient Assignments"]
)


def get_active_staff_profile(user_id: int, db: Session):
    return (
        db.query(StaffProfile)
        .filter(
            StaffProfile.user_id == user_id,
            StaffProfile.is_active.is_(True)
        )
        .first()
    )


def assignment_to_dict(assignment, patient, doctor):
    return {
        "assignment_id": assignment.id,
        "patient_id": patient.id,
        "patient_code": patient.patient_code,
        "patient_name": patient.name,
        "doctor_user_id": doctor.id,
        "doctor_name": doctor.name,
        "doctor_email": doctor.email,
        "is_active": assignment.is_active,
        "assigned_at": (
            assignment.assigned_at.isoformat()
            if assignment.assigned_at
            else None
        )
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def assign_patient_to_doctor(
    patient_id: int = Form(...),
    doctor_user_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {"admin", "department_admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin or Department Admin can assign patients"
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    doctor = (
        db.query(User)
        .filter(
            User.id == doctor_user_id,
            User.role == "doctor"
        )
        .first()
    )

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor account not found"
        )

    doctor_profile = get_active_staff_profile(
        user_id=doctor.id,
        db=db
    )

    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor does not have an active staff profile"
        )

    if current_user.role == "department_admin":
        admin_profile = get_active_staff_profile(
            user_id=current_user.id,
            db=db
        )

        if not admin_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active department admin profile required"
            )

        if admin_profile.department_id != doctor_profile.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assign patients to doctors in your department"
            )

    assignment = (
        db.query(PatientDoctorAssignment)
        .filter(
            PatientDoctorAssignment.patient_id == patient_id,
            PatientDoctorAssignment.doctor_user_id == doctor_user_id
        )
        .first()
    )

    if assignment and assignment.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This patient is already assigned to this doctor"
        )

    if assignment:
        assignment.is_active = True
        assignment.assigned_by_user_id = current_user.id
        assignment.unassigned_at = None
    else:
        assignment = PatientDoctorAssignment(
            patient_id=patient_id,
            doctor_user_id=doctor_user_id,
            assigned_by_user_id=current_user.id,
            is_active=True
        )
        db.add(assignment)

    db.commit()
    db.refresh(assignment)

    return assignment_to_dict(
        assignment=assignment,
        patient=patient,
        doctor=doctor
    )


@router.get("/")
def list_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(
            PatientDoctorAssignment,
            Patient,
            User
        )
        .join(
            Patient,
            Patient.id == PatientDoctorAssignment.patient_id
        )
        .join(
            User,
            User.id == PatientDoctorAssignment.doctor_user_id
        )
    )

    if current_user.role == "admin":
        pass

    elif current_user.role == "department_admin":
        admin_profile = get_active_staff_profile(
            user_id=current_user.id,
            db=db
        )

        if not admin_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active department admin profile required"
            )

        doctor_ids = (
            db.query(StaffProfile.user_id)
            .join(User, User.id == StaffProfile.user_id)
            .filter(
                StaffProfile.department_id == admin_profile.department_id,
                StaffProfile.is_active.is_(True),
                User.role == "doctor"
            )
        )

        query = query.filter(
            PatientDoctorAssignment.doctor_user_id.in_(doctor_ids)
        )

    elif current_user.role == "doctor":
        query = query.filter(
            PatientDoctorAssignment.doctor_user_id == current_user.id
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assignment access required"
        )

    rows = (
        query
        .filter(PatientDoctorAssignment.is_active.is_(True))
        .order_by(PatientDoctorAssignment.assigned_at.desc())
        .all()
    )

    return [
        assignment_to_dict(assignment, patient, doctor)
        for assignment, patient, doctor in rows
    ]


@router.get("/my-patients")
def get_my_assigned_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view their assigned patients"
        )

    rows = (
        db.query(PatientDoctorAssignment, Patient)
        .join(
            Patient,
            Patient.id == PatientDoctorAssignment.patient_id
        )
        .filter(
            PatientDoctorAssignment.doctor_user_id == current_user.id,
            PatientDoctorAssignment.is_active.is_(True)
        )
        .order_by(Patient.name)
        .all()
    )

    return [
        {
            "assignment_id": assignment.id,
            "patient_id": patient.id,
            "patient_code": patient.patient_code,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone
        }
        for assignment, patient in rows
    ]