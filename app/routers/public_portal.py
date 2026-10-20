from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import User, Patient, HealthRecord, MedicalReport, RiskPrediction
from app.hms_models import StaffProfile, Department, Appointment, Prescription, Bill, BillItem, LabOrder, LabResult
from app.utils.security import hash_password
from app.routers.auth import get_current_user

router = APIRouter(prefix="/public", tags=["Public Hospital Portal"])

class PublicBooking(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    age: int = Field(ge=0, le=120)
    gender: str = Field(min_length=1, max_length=20)
    phone: str = Field(min_length=7, max_length=20)
    address: str | None = None
    doctor_user_id: int
    appointment_date: datetime
    reason: str = Field(min_length=3, max_length=1000)


def doctor_rows(db: Session):
    rows = (db.query(User, StaffProfile, Department)
        .join(StaffProfile, StaffProfile.user_id == User.id)
        .join(Department, Department.id == StaffProfile.department_id)
        .filter(User.role == "doctor", StaffProfile.is_active.is_(True), Department.is_active.is_(True))
        .order_by(User.name).all())
    return [{"id": u.id, "name": u.name, "email": u.email,
             "specialty": p.specialty or p.designation or "General Medicine",
             "qualification": p.qualification or "",
             "department": d.name,
             "shift_start": p.shift_start or "09:00", "shift_end": p.shift_end or "17:00"}
            for u, p, d in rows]

@router.get("/doctors")
def public_doctors(db: Session = Depends(get_db)):
    return doctor_rows(db)

@router.get("/availability")
def public_availability(doctor_user_id: int, day: date = Query(...), db: Session = Depends(get_db)):
    if day < date.today() or day > date.today() + timedelta(days=60):
        raise HTTPException(status_code=400, detail="Choose a date within the next 60 days")
    doctor = next((d for d in doctor_rows(db) if d["id"] == doctor_user_id), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor is not available for public booking")
    try:
        start_h, start_m = map(int, doctor["shift_start"].split(":" )[:2])
        end_h, end_m = map(int, doctor["shift_end"].split(":" )[:2])
    except (ValueError, AttributeError):
        start_h, start_m, end_h, end_m = 9, 0, 17, 0
    start = datetime.combine(day, time(start_h, start_m), tzinfo=ZoneInfo("Asia/Kolkata")).astimezone(timezone.utc)
    end = datetime.combine(day, time(end_h, end_m), tzinfo=ZoneInfo("Asia/Kolkata")).astimezone(timezone.utc)
    booked = {a.appointment_date.replace(tzinfo=timezone.utc) if a.appointment_date.tzinfo is None else a.appointment_date.astimezone(timezone.utc)
              for a in db.query(Appointment).filter(Appointment.doctor_user_id == doctor_user_id,
                  Appointment.is_active.is_(True), Appointment.status == "scheduled",
                  Appointment.appointment_date >= start, Appointment.appointment_date < end).all()}
    now = datetime.now(timezone.utc)
    slots = []
    slot = start
    while slot + timedelta(minutes=30) <= end:
        if slot not in booked and slot > now:
            slots.append({"value": slot.isoformat(), "label": slot.astimezone(ZoneInfo("Asia/Kolkata")).strftime("%I:%M %p IST")})
        slot += timedelta(minutes=30)
    return {"doctor": doctor["name"], "date": day.isoformat(), "slots": slots}

@router.post("/book", status_code=201)
def register_and_book(data: PublicBooking, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()
    if data.appointment_date.tzinfo is None:
        raise HTTPException(status_code=400, detail="Appointment time must include a timezone")
    appointment_date = data.appointment_date.astimezone(timezone.utc)
    if appointment_date <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Choose a future appointment slot")
    doctor = next((d for d in doctor_rows(db) if d["id"] == data.doctor_user_id), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not available")
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        if existing_user.role != "patient":
            raise HTTPException(status_code=409, detail="This email is already used by a hospital staff account. Please use a different email.")
        raise HTTPException(status_code=409, detail="An account already exists with this email. Please sign in first to book an appointment.")
    conflict = db.query(Appointment).filter(Appointment.doctor_user_id == data.doctor_user_id,
        Appointment.appointment_date == appointment_date, Appointment.is_active.is_(True),
        Appointment.status == "scheduled").first()
    if conflict:
        raise HTTPException(status_code=409, detail="This slot was just booked. Please choose another time.")
    patient_code = "PT-" + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    user = User(name=data.name.strip(), email=email, password=hash_password(data.password), role="patient")
    try:
        db.add(user); db.flush()
        patient = Patient(patient_code=patient_code, name=data.name.strip(), age=data.age,
            gender=data.gender.strip(), phone=data.phone.strip(), address=(data.address or "").strip() or None,
            medical_history=None, user_id=user.id, created_by=None)
        db.add(patient); db.flush()
        appointment = Appointment(patient_id=patient.id, doctor_user_id=data.doctor_user_id,
            created_by_user_id=None, appointment_date=appointment_date, reason=data.reason.strip(),
            notes=None, status="scheduled", is_active=True)
        db.add(appointment); db.commit(); db.refresh(user); db.refresh(patient); db.refresh(appointment)
    except Exception as exc:
        db.rollback()
        # The database's unique doctor/date constraint also protects concurrent booking attempts.
        if "uq_doctor_appointment_datetime" in str(exc) or "appointments_doctor_user_id_appointment_date_key" in str(exc):
            raise HTTPException(status_code=409, detail="This slot was just booked. Please choose another time.")
        raise HTTPException(status_code=500, detail="Could not complete registration and booking. Please try again.")
    return {"message": "Account created and appointment booked successfully", "patient_code": patient.patient_code,
            "patient_id": patient.id, "appointment": {"id": appointment.id, "doctor_name": doctor["name"],
            "department": doctor["department"], "specialty": doctor["specialty"],
            "appointment_date": appointment.appointment_date.isoformat(), "status": appointment.status,
            "reason": appointment.reason}, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}

class PatientProfileUpdate(BaseModel):
    name: str | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    phone: str | None = None
    address: str | None = None
    medical_history: str | None = None


def get_or_create_patient(current_user: User, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        patient_code = "PT-" + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        patient = Patient(
            patient_code=patient_code,
            name=current_user.name,
            age=25,
            gender="Not specified",
            phone="",
            address=None,
            medical_history=None,
            user_id=current_user.id,
            created_by=None,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
    return patient


class ExistingPatientBooking(BaseModel):
    doctor_user_id: int
    appointment_date: datetime
    reason: str = Field(min_length=3, max_length=1000)

@router.post("/book-existing", status_code=201)
def book_existing_patient(data: ExistingPatientBooking, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    if data.appointment_date.tzinfo is None:
        raise HTTPException(status_code=400, detail="Appointment time must include a timezone")
    appointment_date = data.appointment_date.astimezone(timezone.utc)
    if appointment_date <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Choose a future appointment slot")
    doctor = next((d for d in doctor_rows(db) if d["id"] == data.doctor_user_id), None)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not available")
    conflict = db.query(Appointment).filter(Appointment.doctor_user_id == data.doctor_user_id,
        Appointment.appointment_date == appointment_date, Appointment.is_active.is_(True),
        Appointment.status == "scheduled").first()
    if conflict:
        raise HTTPException(status_code=409, detail="This slot was just booked. Please choose another time.")
    appointment = Appointment(patient_id=patient.id, doctor_user_id=data.doctor_user_id,
        created_by_user_id=None, appointment_date=appointment_date, reason=data.reason.strip(),
        notes=None, status="scheduled", is_active=True)
    try:
        db.add(appointment); db.commit(); db.refresh(appointment)
    except Exception as exc:
        db.rollback()
        if "uq_doctor_appointment_datetime" in str(exc) or "appointments_doctor_user_id_appointment_date_key" in str(exc):
            raise HTTPException(status_code=409, detail="This slot was just booked. Please choose another time.")
        raise HTTPException(status_code=500, detail="Could not complete booking. Please try again.")
    return {"message":"Appointment booked successfully", "appointment":{"id":appointment.id,
        "doctor_name":doctor["name"], "department":doctor["department"], "appointment_date":appointment.appointment_date.isoformat(),
        "status":appointment.status, "reason":appointment.reason}}

@router.get("/my-appointments")
def my_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.appointment_date.desc()).all()
    return {"patient": {"id": patient.id, "name": patient.name, "email": current_user.email, "patient_code": patient.patient_code},
            "appointments": [{"id": a.id, "doctor_name": a.doctor.name if a.doctor else "Doctor",
                "doctor_email": a.doctor.email if a.doctor else None, "appointment_date": a.appointment_date.isoformat(),
                "status": a.status, "reason": a.reason, "notes": a.notes} for a in appointments]}

@router.get("/my-profile")
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    return {
        "id": patient.id,
        "patient_code": patient.patient_code,
        "name": patient.name,
        "email": current_user.email,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone,
        "address": patient.address,
        "medical_history": patient.medical_history,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
    }

@router.put("/my-profile")
def update_my_profile(data: PatientProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    if data.name:
        patient.name = data.name.strip()
        current_user.name = data.name.strip()
    if data.age is not None:
        patient.age = data.age
    if data.gender:
        patient.gender = data.gender.strip()
    if data.phone is not None:
        patient.phone = data.phone.strip()
    if data.address is not None:
        patient.address = data.address.strip()
    if data.medical_history is not None:
        patient.medical_history = data.medical_history.strip()
    db.commit()
    db.refresh(patient)
    return {
        "message": "Profile updated successfully",
        "profile": {
            "id": patient.id,
            "patient_code": patient.patient_code,
            "name": patient.name,
            "email": current_user.email,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "address": patient.address,
            "medical_history": patient.medical_history,
        }
    }

@router.patch("/appointments/{appointment_id}/cancel")
def cancel_my_appointment(appointment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.patient_id == patient.id,
        Appointment.is_active.is_(True)
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or already cancelled")
    appointment.status = "cancelled"
    appointment.is_active = False
    appointment.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Appointment cancelled successfully", "id": appointment.id, "status": "cancelled"}

@router.get("/my-prescriptions")
def get_my_prescriptions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient.id).order_by(Prescription.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "medicine_name": p.medicine_name,
            "dosage": p.dosage,
            "frequency": p.frequency,
            "duration": p.duration,
            "instructions": p.instructions,
            "doctor_name": p.doctor.name if p.doctor else "Doctor",
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in prescriptions
    ]

@router.get("/my-bills")
def get_my_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    bills = db.query(Bill).filter(Bill.patient_id == patient.id).order_by(Bill.created_at.desc()).all()
    return [
        {
            "id": b.id,
            "bill_number": b.bill_number,
            "subtotal": b.subtotal,
            "discount": b.discount,
            "tax": b.tax,
            "total_amount": b.total_amount,
            "paid_amount": b.paid_amount,
            "payment_status": b.payment_status,
            "notes": b.notes,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "items": [
                {
                    "id": item.id,
                    "item_type": item.item_type,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                }
                for item in b.items
            ]
        }
        for b in bills
    ]

@router.get("/my-labs")
def get_my_labs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    orders = db.query(LabOrder).filter(LabOrder.patient_id == patient.id).order_by(LabOrder.ordered_at.desc()).all()
    res = []
    for order in orders:
        result = db.query(LabResult).filter(LabResult.lab_order_id == order.id).first()
        res.append({
            "order_id": order.id,
            "test_name": order.test_name,
            "test_type": order.test_type,
            "priority": order.priority,
            "status": order.status,
            "clinical_notes": order.clinical_notes,
            "ordered_at": order.ordered_at.isoformat() if order.ordered_at else None,
            "doctor_name": order.doctor.name if order.doctor else None,
            "result": {
                "id": result.id,
                "result_value": result.result_value,
                "unit": result.unit,
                "reference_range": result.reference_range,
                "interpretation": result.interpretation,
                "result_status": result.result_status,
                "remarks": result.remarks,
                "completed_at": result.completed_at.isoformat() if result.completed_at else None,
            } if result else None
        })
    return res

@router.get("/my-records")
def get_my_records(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient account required")
    patient = get_or_create_patient(current_user, db)
    health_records = db.query(HealthRecord).filter(HealthRecord.patient_id == patient.id).order_by(HealthRecord.created_at.desc()).all()
    reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient.id).order_by(MedicalReport.created_at.desc()).all()
    predictions = db.query(RiskPrediction).filter(RiskPrediction.patient_id == patient.id).order_by(RiskPrediction.created_at.desc()).all()
    return {
        "health_records": [
            {
                "id": r.id,
                "glucose": r.glucose,
                "blood_pressure": r.blood_pressure,
                "bmi": r.bmi,
                "cholesterol": r.cholesterol,
                "heart_rate": r.heart_rate,
                "risk_label": r.risk_label,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in health_records
        ],
        "medical_reports": [
            {
                "id": rep.id,
                "file_name": rep.file_name,
                "file_type": rep.file_type,
                "extracted_text": rep.extracted_text,
                "created_at": rep.created_at.isoformat() if rep.created_at else None,
            }
            for rep in reports
        ],
        "risk_predictions": [
            {
                "id": pred.id,
                "risk": pred.risk,
                "confidence": pred.confidence,
                "probabilities": pred.probabilities,
                "created_at": pred.created_at.isoformat() if pred.created_at else None,
            }
            for pred in predictions
        ]
    }
