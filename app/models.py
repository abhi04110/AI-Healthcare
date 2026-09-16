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

    patients = relationship(
        "Patient",
        back_populates="created_by_user"
    )


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

    created_by_user = relationship(
        "User",
        back_populates="patients"
    )

    health_records = relationship(
        "HealthRecord",
        back_populates="patient",
        cascade="all, delete"
    )

    medical_reports = relationship(
        "MedicalReport",
        back_populates="patient",
        cascade="all, delete"
    )


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

    patient = relationship(
        "Patient",
        back_populates="health_records"
    )


class MedicalReport(Base):

    __tablename__ = "medical_reports"

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

    file_name = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(50),
        nullable=False
    )

    extracted_text = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    patient = relationship(
        "Patient",
        back_populates="medical_reports"
    )