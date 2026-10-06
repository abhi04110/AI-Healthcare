from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import (
    Medicine,
    MedicineDispensing,
    Prescription
)
from app.schemas import (
    MedicineCreate,
    MedicineStockUpdate,
    MedicineDispenseCreate
)
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/pharmacy",
    tags=["HMS Pharmacy"]
)


@router.post("/medicines/", status_code=201)
def create_medicine(
    data: MedicineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "department_admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only pharmacy staff or admins can add medicines"
        )

    existing = (
        db.query(Medicine)
        .filter(
            Medicine.batch_number == data.batch_number
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Medicine batch number already exists"
        )

    medicine = Medicine(
        medicine_name=data.medicine_name,
        generic_name=data.generic_name,
        category=data.category,
        manufacturer=data.manufacturer,
        batch_number=data.batch_number,
        quantity=data.quantity,
        unit_price=data.unit_price,
        expiry_date=data.expiry_date,
        is_active=True
    )

    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    return medicine


@router.get("/medicines/")
def get_medicines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "department_admin",
        "doctor"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    return (
        db.query(Medicine)
        .filter(
            Medicine.is_active == True
        )
        .order_by(
            Medicine.medicine_name.asc()
        )
        .all()
    )


@router.get("/medicines/{medicine_id}")
def get_medicine(
    medicine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "department_admin",
        "doctor"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    medicine = (
        db.query(Medicine)
        .filter(
            Medicine.id == medicine_id,
            Medicine.is_active == True
        )
        .first()
    )

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    return medicine


@router.patch("/medicines/{medicine_id}/stock")
def update_medicine_stock(
    medicine_id: int,
    data: MedicineStockUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "department_admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only pharmacy staff can update stock"
        )

    medicine = (
        db.query(Medicine)
        .filter(
            Medicine.id == medicine_id,
            Medicine.is_active == True
        )
        .first()
    )

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    medicine.quantity = data.quantity

    db.commit()
    db.refresh(medicine)

    return medicine


@router.delete("/medicines/{medicine_id}")
def deactivate_medicine(
    medicine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "department_admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only pharmacy staff can deactivate medicines"
        )

    medicine = (
        db.query(Medicine)
        .filter(
            Medicine.id == medicine_id,
            Medicine.is_active == True
        )
        .first()
    )

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    medicine.is_active = False

    db.commit()

    return {
        "message": "Medicine deactivated successfully"
    }


@router.get("/medicines/expiring")
def get_expiring_medicines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "department_admin"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    now = datetime.now(timezone.utc)

    return (
        db.query(Medicine)
        .filter(
            Medicine.is_active == True,
            Medicine.expiry_date <= now
        )
        .order_by(
            Medicine.expiry_date.asc()
        )
        .all()
    )


@router.post("/dispense/", status_code=201)
def dispense_medicine(
    data: MedicineDispenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only pharmacists or admins can dispense medicines"
        )

    prescription = (
        db.query(Prescription)
        .filter(
            Prescription.id == data.prescription_id
        )
        .first()
    )

    if not prescription:
        raise HTTPException(
            status_code=404,
            detail="Prescription not found"
        )

    medicine = (
        db.query(Medicine)
        .filter(
            Medicine.id == data.medicine_id,
            Medicine.is_active == True
        )
        .first()
    )

    if not medicine:
        raise HTTPException(
            status_code=404,
            detail="Medicine not found"
        )

    now = datetime.now(timezone.utc)

    if medicine.expiry_date <= now:
        raise HTTPException(
            status_code=400,
            detail="Cannot dispense expired medicine"
        )

    if medicine.quantity < data.quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock. "
                f"Available quantity: {medicine.quantity}"
            )
        )

    existing = (
        db.query(MedicineDispensing)
        .filter(
            MedicineDispensing.prescription_id
            == data.prescription_id,
            MedicineDispensing.medicine_id
            == data.medicine_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This medicine has already been dispensed for this prescription"
        )

    total_price = (
        medicine.unit_price * data.quantity
    )

    medicine.quantity -= data.quantity

    dispensing = MedicineDispensing(
        prescription_id=prescription.id,
        patient_id=prescription.patient_id,
        medicine_id=medicine.id,
        pharmacist_user_id=current_user.id,
        quantity=data.quantity,
        unit_price=medicine.unit_price,
        total_price=total_price,
        notes=data.notes
    )

    db.add(dispensing)
    db.commit()
    db.refresh(dispensing)

    return dispensing


@router.get("/dispensing/my")
def get_my_dispensing_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    query = (
        db.query(MedicineDispensing)
        .order_by(
            MedicineDispensing.dispensed_at.desc()
        )
    )

    if current_user.role == "pharmacist":
        query = query.filter(
            MedicineDispensing.pharmacist_user_id
            == current_user.id
        )

    return query.all()


@router.get("/patient/{patient_id}")
def get_patient_dispensing(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "pharmacist",
        "doctor"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    patient = (
        db.query(Patient)
        .filter(
            Patient.id == patient_id
        )
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return (
        db.query(MedicineDispensing)
        .filter(
            MedicineDispensing.patient_id == patient_id
        )
        .order_by(
            MedicineDispensing.dispensed_at.desc()
        )
        .all()
    )