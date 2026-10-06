from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    Float,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(100),
        unique=True,
        nullable=False
    )

    code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False
    )

    employee_code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    designation = Column(String(100), nullable=True)
    qualification = Column(String(200), nullable=True)
    specialty = Column(String(200), nullable=True)

    shift_start = Column(String(10), nullable=True)
    shift_end = Column(String(10), nullable=True)

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class PatientDoctorAssignment(Base):
    __tablename__ = "patient_doctor_assignments"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False
    )

    doctor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    assigned_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    assigned_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    unassigned_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "patient_id",
            "doctor_user_id",
            name="uq_patient_doctor_assignment"
        ),
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    doctor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    appointment_date = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    reason = Column(Text, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="scheduled"
    )

    notes = Column(Text, nullable=True)

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    patient = relationship("Patient")

    doctor = relationship(
        "User",
        foreign_keys=[doctor_user_id]
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_user_id]
    )

    __table_args__ = (
        UniqueConstraint(
            "doctor_user_id",
            "appointment_date",
            name="uq_doctor_appointment_datetime"
        ),
    )


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)

    appointment_id = Column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    doctor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    symptoms = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)

    follow_up_date = Column(
        DateTime(timezone=True),
        nullable=True
    )

    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    appointment = relationship("Appointment")
    patient = relationship("Patient")

    doctor = relationship(
        "User",
        foreign_keys=[doctor_user_id]
    )


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)

    consultation_id = Column(
        Integer,
        ForeignKey("consultations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    doctor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    medicine_name = Column(
        String(200),
        nullable=False
    )

    dosage = Column(
        String(100),
        nullable=False
    )

    frequency = Column(
        String(100),
        nullable=False
    )

    duration = Column(
        String(100),
        nullable=False
    )

    instructions = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    consultation = relationship("Consultation")
    patient = relationship("Patient")

    doctor = relationship(
        "User",
        foreign_keys=[doctor_user_id]
    )


class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    doctor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    test_name = Column(
        String(200),
        nullable=False
    )

    test_type = Column(
        String(100),
        nullable=True
    )

    priority = Column(
        String(30),
        nullable=False,
        default="normal"
    )

    clinical_notes = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="ordered"
    )

    ordered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    patient = relationship("Patient")

    doctor = relationship(
        "User",
        foreign_keys=[doctor_user_id]
    )


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)

    lab_order_id = Column(
        Integer,
        ForeignKey("lab_orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    technician_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    result_value = Column(
        Text,
        nullable=False
    )

    unit = Column(
        String(50),
        nullable=True
    )

    reference_range = Column(
        String(100),
        nullable=True
    )

    interpretation = Column(
        Text,
        nullable=True
    )

    result_status = Column(
        String(30),
        nullable=False,
        default="normal"
    )

    remarks = Column(
        Text,
        nullable=True
    )

    completed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lab_order = relationship("LabOrder")
    patient = relationship("Patient")

    technician = relationship(
        "User",
        foreign_keys=[technician_user_id]
    )


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    medicine_name = Column(
        String(200),
        nullable=False,
        index=True
    )

    generic_name = Column(
        String(200),
        nullable=True
    )

    category = Column(
        String(100),
        nullable=True
    )

    manufacturer = Column(
        String(200),
        nullable=True
    )

    batch_number = Column(
        String(100),
        nullable=False,
        unique=True
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=0
    )

    unit_price = Column(
        Float,
        nullable=False,
        default=0
    )

    expiry_date = Column(
        DateTime(timezone=True),
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class MedicineDispensing(Base):
    __tablename__ = "medicine_dispensings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    prescription_id = Column(
        Integer,
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    medicine_id = Column(
        Integer,
        ForeignKey("medicines.id", ondelete="CASCADE"),
        nullable=False
    )

    pharmacist_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    unit_price = Column(
        Float,
        nullable=False
    )

    total_price = Column(
        Float,
        nullable=False
    )

    dispensed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    notes = Column(
        Text,
        nullable=True
    )

    prescription = relationship("Prescription")
    patient = relationship("Patient")
    medicine = relationship("Medicine")

    pharmacist = relationship(
        "User",
        foreign_keys=[pharmacist_user_id]
    )


class Bill(Base):
    __tablename__ = "bills"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    bill_number = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    subtotal = Column(
        Float,
        nullable=False,
        default=0
    )

    discount = Column(
        Float,
        nullable=False,
        default=0
    )

    tax = Column(
        Float,
        nullable=False,
        default=0
    )

    total_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    paid_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    payment_status = Column(
        String(30),
        nullable=False,
        default="pending"
    )

    notes = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    patient = relationship("Patient")

    created_by = relationship(
        "User",
        foreign_keys=[created_by_user_id]
    )

    items = relationship(
        "BillItem",
        back_populates="bill",
        cascade="all, delete-orphan"
    )


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    bill_id = Column(
        Integer,
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    item_type = Column(
        String(50),
        nullable=False
    )

    description = Column(
        String(300),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=1
    )

    unit_price = Column(
        Float,
        nullable=False,
        default=0
    )

    total_price = Column(
        Float,
        nullable=False,
        default=0
    )

    bill = relationship(
        "Bill",
        back_populates="items"
    )
    
class EmergencyCase(Base):
    __tablename__ = "emergency_cases"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    priority = Column(String(30), nullable=False, default="normal")
    symptoms = Column(Text, nullable=True)
    vitals = Column(Text, nullable=True)
    treatment_notes = Column(Text, nullable=True)

    status = Column(String(30), nullable=False, default="waiting")
    admission_required = Column(Boolean, default=False)

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
class ICUAdmission(Base):
    __tablename__ = "icu_admissions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    doctor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    nurse_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    bed_number = Column(String(50), nullable=False)
    room_number = Column(String(50), nullable=True)

    admission_reason = Column(Text, nullable=False)
    vitals = Column(Text, nullable=True)
    treatment_notes = Column(Text, nullable=True)

    status = Column(String(30), nullable=False, default="admitted")

    admitted_at = Column(DateTime, default=datetime.utcnow)
    discharged_at = Column(DateTime, nullable=True)

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
class OperationTheatreCase(Base):
    __tablename__ = "operation_theatre_cases"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    surgeon_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assistant_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    nurse_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    operation_name = Column(String(200), nullable=False)
    operation_type = Column(String(100), nullable=True)

    theatre_number = Column(String(50), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)

    diagnosis = Column(Text, nullable=True)
    pre_op_notes = Column(Text, nullable=True)
    post_op_notes = Column(Text, nullable=True)

    status = Column(String(30), nullable=False, default="scheduled")

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
class HousekeepingTask(Base):
    __tablename__ = "housekeeping_tasks"

    id = Column(Integer, primary_key=True, index=True)

    task_type = Column(String(100), nullable=False)
    area = Column(String(200), nullable=False)
    room_number = Column(String(50), nullable=True)

    priority = Column(String(30), nullable=False, default="normal")

    assigned_worker_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    description = Column(Text, nullable=True)

    status = Column(
        String(30),
        nullable=False,
        default="pending"
    )

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
class CanteenMenuItem(Base):
    __tablename__ = "canteen_menu_items"

    id = Column(Integer, primary_key=True, index=True)

    item_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    price = Column(Float, nullable=False)
    available_quantity = Column(Integer, nullable=False, default=0)

    is_available = Column(Boolean, nullable=False, default=True)

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


class CanteenOrder(Base):
    __tablename__ = "canteen_orders"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=True
    )

    ordered_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    menu_item_id = Column(
        Integer,
        ForeignKey("canteen_menu_items.id"),
        nullable=False
    )

    quantity = Column(Integer, nullable=False, default=1)

    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)

    status = Column(
        String(30),
        nullable=False,
        default="pending"
    )

    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )