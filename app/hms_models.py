from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint
)
from sqlalchemy.sql import func

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    code = Column(
        String(30),
        unique=True,
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
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
        nullable=False,
        index=True
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False,
        index=True
    )

    employee_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    designation = Column(
        String(100),
        nullable=False
    )

    qualification = Column(
        String(200),
        nullable=True
    )

    specialty = Column(
        String(150),
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
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class PatientDoctorAssignment(Base):
    __tablename__ = "patient_doctor_assignments"

    __table_args__ = (
        UniqueConstraint(
            "patient_id",
            "doctor_user_id",
            name="uq_patient_doctor_assignment"
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False,
        index=True
    )

    doctor_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    assigned_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    unassigned_at = Column(
        DateTime(timezone=True),
        nullable=True
    )