import os

from fastapi import (
    HTTPException,
    status
)

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import (
    Patient,
    User
)

from app.schemas import (
    PatientCreate,
    PatientUpdate
)
from app.hms_models import (
    PatientDoctorAssignment,
    Appointment,
    Bill,
    BillItem,
    CanteenOrder,
    Consultation,
    EmergencyCase,
    ICUAdmission,
    OperationTheatreCase,
    Prescription,
    LabOrder,
    LabResult
)
from app.chat_models import ChatMessage, ChatReadState
from app.utils.security import hash_password


def create_patient_service(
    patient_data: PatientCreate,
    current_user: User,
    db: Session,
    email: str | None = None,
    password: str | None = None
):
    if current_user.role == "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patients cannot create patient records"
        )

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

    portal_user_id = None
    if email and password:
        clean_email = email.strip().lower()
        existing_user = db.query(User).filter(User.email == clean_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{clean_email}' is already registered for another account"
            )
        new_user = User(
            name=patient_data.name.strip(),
            email=clean_email,
            password=hash_password(password),
            role="patient"
        )
        db.add(new_user)
        db.flush()
        portal_user_id = new_user.id

    patient = Patient(
        patient_code=patient_data.patient_code.strip(),
        name=patient_data.name.strip(),
        age=patient_data.age,
        gender=patient_data.gender.strip(),
        phone=patient_data.phone,
        address=patient_data.address,
        medical_history=patient_data.medical_history,
        user_id=portal_user_id,
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
    if current_user.role in {"admin", "sub_admin", "receptionist"}:
        query = db.query(Patient)

    elif current_user.role == "patient":
        query = db.query(Patient).filter(Patient.user_id == current_user.id)

    elif current_user.role == "doctor":
        query = (
            db.query(Patient)
            .join(
                PatientDoctorAssignment,
                PatientDoctorAssignment.patient_id == Patient.id
            )
            .filter(
                PatientDoctorAssignment.doctor_user_id == current_user.id,
                PatientDoctorAssignment.is_active.is_(True)
            )
        )

    else:
        query = db.query(Patient).filter(
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
        .filter(Patient.id == patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    if current_user.role in {"admin", "sub_admin", "receptionist"}:
        return patient

    if current_user.role == "patient":
        if patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this patient"
            )
        return patient

    if current_user.role == "doctor":
        assignment = (
            db.query(PatientDoctorAssignment)
            .filter(
                PatientDoctorAssignment.patient_id == patient_id,
                PatientDoctorAssignment.doctor_user_id == current_user.id,
                PatientDoctorAssignment.is_active.is_(True)
            )
            .first()
        )

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this patient"
            )

        return patient

    if patient.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this patient"
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
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can delete patient records from the system"
        )

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

    linked_user_id = patient.user_id

    try:
        # 1. Clean up HMS assignments and appointments
        db.query(PatientDoctorAssignment).filter(
            PatientDoctorAssignment.patient_id == patient_id
        ).delete(synchronize_session=False)

        db.query(Appointment).filter(
            Appointment.patient_id == patient_id
        ).delete(synchronize_session=False)

        # 2. Clean up billing records
        bill_ids = [
            b.id for b in db.query(Bill.id).filter(Bill.patient_id == patient_id).all()
        ]
        if bill_ids:
            db.query(BillItem).filter(
                BillItem.bill_id.in_(bill_ids)
            ).delete(synchronize_session=False)
            db.query(Bill).filter(
                Bill.id.in_(bill_ids)
            ).delete(synchronize_session=False)

        # 3. Clean up Clinical records
        db.query(Consultation).filter(
            Consultation.patient_id == patient_id
        ).delete(synchronize_session=False)

        db.query(Prescription).filter(
            Prescription.patient_id == patient_id
        ).delete(synchronize_session=False)

        lab_order_ids = [
            lo.id for lo in db.query(LabOrder.id).filter(LabOrder.patient_id == patient_id).all()
        ]
        if lab_order_ids:
            db.query(LabResult).filter(
                LabResult.lab_order_id.in_(lab_order_ids)
            ).delete(synchronize_session=False)
            db.query(LabOrder).filter(
                LabOrder.id.in_(lab_order_ids)
            ).delete(synchronize_session=False)

        db.query(EmergencyCase).filter(
            EmergencyCase.patient_id == patient_id
        ).delete(synchronize_session=False)

        db.query(ICUAdmission).filter(
            ICUAdmission.patient_id == patient_id
        ).delete(synchronize_session=False)

        db.query(OperationTheatreCase).filter(
            OperationTheatreCase.patient_id == patient_id
        ).delete(synchronize_session=False)

        db.query(CanteenOrder).filter(
            CanteenOrder.patient_id == patient_id
        ).delete(synchronize_session=False)

        # 4. Clean up patient's user account and chat records if portal account existed
        if linked_user_id:
            db.query(ChatReadState).filter(
                ChatReadState.user_id == linked_user_id
            ).delete(synchronize_session=False)

            db.query(ChatMessage).filter(
                or_(
                    ChatMessage.sender_id == linked_user_id,
                    ChatMessage.recipient_id == linked_user_id
                )
            ).delete(synchronize_session=False)

            # Unlink first to avoid foreign key constraints
            patient.user_id = None
            db.flush()

            db.query(User).filter(
                User.id == linked_user_id,
                User.role == "patient"
            ).delete(synchronize_session=False)

        # 5. Delete patient record
        db.delete(patient)
        db.commit()

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patient deletion failed: {str(exc)}"
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


def create_portal_account_service(
    patient_id: int,
    email: str,
    password: str,
    current_user: User,
    db: Session
):
    if current_user.role not in {"admin", "sub_admin", "receptionist"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, Sub-Admin, or Receptionist can create patient portal accounts"
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    if patient.user_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient already has an active online portal account"
        )

    clean_email = email.strip().lower()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{clean_email}' is already registered for another account"
        )

    new_user = User(
        name=patient.name,
        email=clean_email,
        password=hash_password(password),
        role="patient"
    )
    db.add(new_user)
    db.flush()

    patient.user_id = new_user.id
    db.commit()
    db.refresh(patient)

    return {
        "status": "success",
        "message": f"Online portal account created successfully for {patient.name}",
        "patient_id": patient.id,
        "user_id": new_user.id,
        "email": new_user.email
    }
