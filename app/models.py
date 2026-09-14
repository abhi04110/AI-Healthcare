from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# =========================================================
# USER TABLE
# =========================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        index=True,
        nullable=False
    )

    password = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(50),
        nullable=False,
        default="doctor"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationship
    patients = relationship(
        "Patient",
        back_populates="created_by_user"
    )


# =========================================================
# PATIENT TABLE
# =========================================================

class Patient(Base):

    __tablename__ = "patients"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    patient_code = Column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )

    name = Column(
        String(100),
        nullable=False
    )

    age = Column(
        Integer,
        nullable=False
    )

    gender = Column(
        String(20),
        nullable=False
    )

    phone = Column(
        String(20),
        nullable=True
    )

    address = Column(
        Text,
        nullable=True
    )

    medical_history = Column(
        Text,
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationship with User
    created_by_user = relationship(
        "User",
        back_populates="patients"
    )

    # Relationship with Health Record
    health_records = relationship(
        "HealthRecord",
        back_populates="patient",
        cascade="all, delete"
    )


# =========================================================
# HEALTH RECORD TABLE
# =========================================================

class HealthRecord(Base):

    __tablename__ = "health_records"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    glucose = Column(
        Float,
        nullable=True
    )

    blood_pressure = Column(
        Float,
        nullable=True
    )

    bmi = Column(
        Float,
        nullable=True
    )

    cholesterol = Column(
        Float,
        nullable=True
    )

    heart_rate = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationship
    patient = relationship(
        "Patient",
        back_populates="health_records"
    )