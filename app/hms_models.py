from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


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

    appointment_date = Column(DateTime(timezone=True), nullable=False, index=True)

    reason = Column(Text, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="scheduled"
    )

    notes = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

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