# from fastapi import (
#     HTTPException,
#     status
# )

# from sqlalchemy.orm import Session

# from app.models import (
#     Patient,
#     User
# )

# from app.schemas import (
#     PatientCreate,
#     PatientUpdate
# )


# def create_patient_service(
#     patient_data: PatientCreate,
#     current_user: User,
#     db: Session
# ):
#     existing_patient = (
#         db.query(Patient)
#         .filter(
#             Patient.patient_code
#             == patient_data.patient_code
#         )
#         .first()
#     )

#     if existing_patient:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Patient code already exists"
#         )

#     patient = Patient(
#         patient_code=patient_data.patient_code.strip(),
#         name=patient_data.name.strip(),
#         age=patient_data.age,
#         gender=patient_data.gender.strip(),
#         phone=patient_data.phone,
#         address=patient_data.address,
#         medical_history=(
#             patient_data.medical_history
#         ),
#         created_by=current_user.id
#     )

#     db.add(patient)
#     db.commit()
#     db.refresh(patient)

#     return patient


# def get_patients_service(
#     current_user: User,
#     db: Session
# ):
#     query = db.query(Patient)

#     if current_user.role != "admin":
#         query = query.filter(
#             Patient.created_by == current_user.id
#         )

#     return (
#         query
#         .order_by(
#             Patient.created_at.desc(),
#             Patient.id.desc()
#         )
#         .all()
#     )


# def get_patient_service(
#     patient_id: int,
#     current_user: User,
#     db: Session
# ):
#     patient = (
#         db.query(Patient)
#         .filter(
#             Patient.id == patient_id
#         )
#         .first()
#     )

#     if not patient:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Patient not found"
#         )

#     if (
#         current_user.role != "admin"
#         and patient.created_by != current_user.id
#     ):
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail=(
#                 "You do not have access "
#                 "to this patient"
#             )
#         )

#     return patient


# def update_patient_service(
#     patient_id: int,
#     patient_data: PatientUpdate,
#     current_user: User,
#     db: Session
# ):
#     patient = get_patient_service(
#         patient_id=patient_id,
#         current_user=current_user,
#         db=db
#     )

#     update_data = patient_data.model_dump(
#         exclude_unset=True
#     )

#     for field, value in update_data.items():

#         if (
#             isinstance(value, str)
#             and field in {
#                 "name",
#                 "gender",
#                 "phone"
#             }
#         ):
#             value = value.strip()

#         setattr(
#             patient,
#             field,
#             value
#         )

#     db.commit()
#     db.refresh(patient)

#     return patient


# def delete_patient_service(
#     patient_id: int,
#     current_user: User,
#     db: Session
# ):
#     patient = get_patient_service(
#         patient_id=patient_id,
#         current_user=current_user,
#         db=db
#     )

#     db.delete(patient)
#     db.commit()

#     return {
#         "message": "Patient deleted successfully"
#     }















import os

from fastapi import (
    HTTPException,
    status
)

from sqlalchemy.orm import Session

from app.models import (
    Patient,
    User
)

from app.schemas import (
    PatientCreate,
    PatientUpdate
)


def create_patient_service(
    patient_data: PatientCreate,
    current_user: User,
    db: Session
):
    existing_patient = (
        db.query(Patient)
        .filter(
            Patient.patient_code
            == patient_data.patient_code
        )
        .first()
    )

    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient code already exists"
        )

    patient = Patient(
        patient_code=patient_data.patient_code.strip(),
        name=patient_data.name.strip(),
        age=patient_data.age,
        gender=patient_data.gender.strip(),
        phone=patient_data.phone,
        address=patient_data.address,
        medical_history=patient_data.medical_history,
        created_by=current_user.id
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return patient


def get_patients_service(
    current_user: User,
    db: Session
):
    query = db.query(Patient)

    if current_user.role != "admin":
        query = query.filter(
            Patient.created_by == current_user.id
        )

    return (
        query
        .order_by(
            Patient.created_at.desc(),
            Patient.id.desc()
        )
        .all()
    )


def get_patient_service(
    patient_id: int,
    current_user: User,
    db: Session
):
    patient = (
        db.query(Patient)
        .filter(
            Patient.id == patient_id
        )
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    if (
        current_user.role != "admin"
        and patient.created_by != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have access "
                "to this patient"
            )
        )

    return patient


def update_patient_service(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: User,
    db: Session
):
    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    update_data = patient_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():

        if (
            isinstance(value, str)
            and field in {
                "name",
                "gender",
                "phone"
            }
        ):
            value = value.strip()

        setattr(
            patient,
            field,
            value
        )

    db.commit()
    db.refresh(patient)

    return patient


def delete_patient_service(
    patient_id: int,
    current_user: User,
    db: Session
):
    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    report_file_paths = [
        report.file_path
        for report in patient.medical_reports
        if report.file_path
    ]

    try:
        db.delete(patient)
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Patient deletion failed"
        )

    deleted_files = 0
    failed_files = []

    for file_path in report_file_paths:

        if not os.path.exists(file_path):
            continue

        try:
            os.remove(file_path)
            deleted_files += 1

        except OSError:
            failed_files.append(file_path)

    response = {
        "message": "Patient and associated database records deleted successfully",
        "patient_id": patient_id,
        "deleted_report_files": deleted_files
    }

    if failed_files:
        response["warning"] = (
            "Patient database records were deleted, "
            "but some uploaded report files could not be removed."
        )

        response["failed_report_files"] = failed_files

    return response