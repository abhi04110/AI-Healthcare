from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.hms_models import (
    LabOrder,
    LabResult,
    PatientDoctorAssignment,
    StaffProfile
)
from app.schemas import (
    LabOrderCreate,
    LabOrderStatusUpdate,
    LabResultCreate
)
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/labs",
    tags=["HMS Laboratory"]
)


@router.post("/orders/", status_code=201)
def create_lab_order(
    data: LabOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role not in {
        "doctor",
        "admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only doctors or admins can create lab orders"
        )

    patient = (
        db.query(__import__("app.models", fromlist=["Patient"]).Patient)
        .filter(
            __import__("app.models", fromlist=["Patient"]).Patient.id
            == data.patient_id
        )
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if current_user.role == "doctor":

        assignment = (
            db.query(PatientDoctorAssignment)
            .filter(
                PatientDoctorAssignment.patient_id == data.patient_id,
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

    order = LabOrder(
        patient_id=data.patient_id,
        doctor_user_id=current_user.id,
        test_name=data.test_name,
        test_type=data.test_type,
        priority=data.priority,
        clinical_notes=data.clinical_notes,
        status="ordered"
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return order


@router.get("/orders/my")
def get_my_lab_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role == "doctor":

        return (
            db.query(LabOrder)
            .filter(
                LabOrder.doctor_user_id == current_user.id
            )
            .order_by(LabOrder.ordered_at.desc())
            .all()
        )

    if current_user.role == "admin":

        return (
            db.query(LabOrder)
            .order_by(LabOrder.ordered_at.desc())
            .all()
        )

    raise HTTPException(
        status_code=403,
        detail="Not authorized"
    )


@router.get("/orders/patient/{patient_id}")
def get_patient_lab_orders(
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
        db.query(LabOrder)
        .filter(
            LabOrder.patient_id == patient_id
        )
        .order_by(LabOrder.ordered_at.desc())
        .all()
    )


@router.patch("/orders/{order_id}/status")
def update_lab_order_status(
    order_id: int,
    data: LabOrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role not in {
        "admin",
        "doctor",
        "lab_technician"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    order = (
        db.query(LabOrder)
        .filter(
            LabOrder.id == order_id
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Lab order not found"
        )

    allowed_statuses = {
        "ordered",
        "processing",
        "completed",
        "cancelled"
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid lab order status"
        )

    order.status = data.status

    db.commit()
    db.refresh(order)

    return order


@router.post("/results/", status_code=201)
def create_lab_result(
    data: LabResultCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.role not in {
        "lab_technician",
        "admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only lab technicians or admins can enter results"
        )

    order = (
        db.query(LabOrder)
        .filter(
            LabOrder.id == data.lab_order_id
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Lab order not found"
        )

    existing = (
        db.query(LabResult)
        .filter(
            LabResult.lab_order_id == data.lab_order_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Result already exists for this lab order"
        )

    result = LabResult(
        lab_order_id=order.id,
        patient_id=order.patient_id,
        technician_user_id=current_user.id,
        result_value=data.result_value,
        unit=data.unit,
        reference_range=data.reference_range,
        interpretation=data.interpretation,
        result_status=data.result_status,
        remarks=data.remarks
    )

    order.status = "completed"

    db.add(result)
    db.commit()
    db.refresh(result)

    return result


@router.get("/results/order/{order_id}")
def get_lab_result(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    result = (
        db.query(LabResult)
        .filter(
            LabResult.lab_order_id == order_id
        )
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Lab result not found"
        )

    if current_user.role == "admin":
        return result

    if current_user.role == "doctor":

        assignment = (
            db.query(PatientDoctorAssignment)
            .filter(
                PatientDoctorAssignment.patient_id == result.patient_id,
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

        return result

    if current_user.role == "lab_technician":

        if result.technician_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own lab results"
            )

        return result

    raise HTTPException(
        status_code=403,
        detail="Not authorized"
    )