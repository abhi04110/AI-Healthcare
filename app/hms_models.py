from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
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

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

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

    designation = Column(
        String(100),
        nullable=True
    )

    qualification = Column(
        String(200),
        nullable=True
    )

    specialty = Column(
        String(200),
        nullable=True
    )

    shift_start = Column(
        String(10),
        nullable=True
    )

    shift_end = Column(
        String(10),
        nullable=True
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


class PatientDoctorAssignment(Base):
    __tablename__ = "patient_doctor_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

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

    reason = Column(
        Text,
        nullable=True
    )

    status = Column(
        String(20),
        nullable=False,
        default="scheduled"
    )

    notes = Column(
        Text,
        nullable=True
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

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

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

    symptoms = Column(
        Text,
        nullable=True
    )

    diagnosis = Column(
        Text,
        nullable=True
    )

    treatment_plan = Column(
        Text,
        nullable=True
    )

    follow_up_date = Column(
        DateTime(timezone=True),
        nullable=True
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

    appointment = relationship("Appointment")

    patient = relationship("Patient")

    doctor = relationship(
        "User",
        foreign_keys=[doctor_user_id]
    )


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

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

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

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