from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import Bill, BillItem
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/billing",
    tags=["HMS Billing"]
)


def calculate_payment_status(
    paid_amount: float,
    total_amount: float
):
    if paid_amount <= 0:
        return "pending"

    if paid_amount >= total_amount:
        return "paid"

    return "partial"


@router.post("/bills/", status_code=201)
def create_bill(
    patient_id: int = Form(...),
    bill_number: str = Form(...),
    discount: float = Form(0),
    tax: float = Form(0),
    notes: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "department_admin",
        "receptionist"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only admin, department admin or receptionist can create bills"
        )

    if discount < 0:
        raise HTTPException(
            status_code=400,
            detail="Discount cannot be negative"
        )

    if tax < 0:
        raise HTTPException(
            status_code=400,
            detail="Tax cannot be negative"
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

    existing = (
        db.query(Bill)
        .filter(
            Bill.bill_number == bill_number
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Bill number already exists"
        )

    bill = Bill(
        patient_id=patient_id,
        created_by_user_id=current_user.id,
        bill_number=bill_number,
        subtotal=0,
        discount=discount,
        tax=tax,
        total_amount=tax - discount,
        paid_amount=0,
        payment_status="pending",
        notes=notes
    )

    if bill.total_amount < 0:
        bill.total_amount = 0

    db.add(bill)
    db.commit()
    db.refresh(bill)

    return bill


@router.get("/bills/")
def get_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "department_admin",
        "receptionist",
        "doctor"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    return (
        db.query(Bill)
        .order_by(
            Bill.created_at.desc()
        )
        .all()
    )


@router.get("/bills/{bill_id}")
def get_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "department_admin",
        "receptionist",
        "doctor"
    }:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    bill = (
        db.query(Bill)
        .filter(
            Bill.id == bill_id
        )
        .first()
    )

    if not bill:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    return {
        "bill": bill,
        "items": bill.items
    }


@router.post("/items/", status_code=201)
def add_bill_item(
    bill_id: int = Form(...),
    item_type: str = Form(...),
    description: str = Form(...),
    quantity: int = Form(...),
    unit_price: float = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "department_admin",
        "receptionist"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only billing staff can add bill items"
        )

    if quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    if unit_price < 0:
        raise HTTPException(
            status_code=400,
            detail="Unit price cannot be negative"
        )

    bill = (
        db.query(Bill)
        .filter(
            Bill.id == bill_id
        )
        .first()
    )

    if not bill:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    if bill.payment_status == "paid":
        raise HTTPException(
            status_code=400,
            detail="Cannot modify a fully paid bill"
        )

    total_price = quantity * unit_price

    item = BillItem(
        bill_id=bill.id,
        item_type=item_type,
        description=description,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price
    )

    db.add(item)

    bill.subtotal += total_price

    calculated_total = (
        bill.subtotal
        - bill.discount
        + bill.tax
    )

    bill.total_amount = max(
        calculated_total,
        0
    )

    bill.payment_status = calculate_payment_status(
        bill.paid_amount,
        bill.total_amount
    )

    db.commit()
    db.refresh(item)

    return item


@router.patch("/bills/{bill_id}/payment")
def update_bill_payment(
    bill_id: int,
    paid_amount: float = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "department_admin",
        "receptionist"
    }:
        raise HTTPException(
            status_code=403,
            detail="Only billing staff can update payments"
        )

    if paid_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Paid amount cannot be negative"
        )

    bill = (
        db.query(Bill)
        .filter(
            Bill.id == bill_id
        )
        .first()
    )

    if not bill:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    if paid_amount > bill.total_amount:
        raise HTTPException(
            status_code=400,
            detail="Paid amount cannot be greater than total bill amount"
        )

    bill.paid_amount = paid_amount

    bill.payment_status = calculate_payment_status(
        bill.paid_amount,
        bill.total_amount
    )

    db.commit()
    db.refresh(bill)

    return bill


@router.get("/patient/{patient_id}")
def get_patient_bills(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in {
        "admin",
        "department_admin",
        "receptionist",
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
        db.query(Bill)
        .filter(
            Bill.patient_id == patient_id
        )
        .order_by(
            Bill.created_at.desc()
        )
        .all()
    )