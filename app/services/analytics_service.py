from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Patient,
    HealthRecord,
    RiskPrediction
)


NUMERIC_FIELDS = [
    "glucose",
    "blood_pressure",
    "bmi",
    "cholesterol",
    "heart_rate"
]


def get_accessible_patient_query(
    db: Session,
    current_user
):
    query = db.query(Patient)

    if current_user.role != "admin":
        query = query.filter(
            Patient.created_by == current_user.id
        )

    return query


def get_accessible_health_records_query(
    db: Session,
    current_user
):
    query = db.query(HealthRecord).join(
        Patient,
        HealthRecord.patient_id == Patient.id
    )

    if current_user.role != "admin":
        query = query.filter(
            Patient.created_by == current_user.id
        )

    return query


def get_accessible_predictions_query(
    db: Session,
    current_user
):
    query = db.query(RiskPrediction).join(
        Patient,
        RiskPrediction.patient_id == Patient.id
    )

    if current_user.role != "admin":
        query = query.filter(
            Patient.created_by == current_user.id
        )

    return query


def get_basic_analytics(
    db: Session,
    current_user
):
    patient_query = get_accessible_patient_query(
        db=db,
        current_user=current_user
    )

    health_record_query = get_accessible_health_records_query(
        db=db,
        current_user=current_user
    )

    total_patients = patient_query.with_entities(
        func.count(Patient.id)
    ).scalar()

    total_health_records = health_record_query.with_entities(
        func.count(HealthRecord.id)
    ).scalar()

    average_age = patient_query.with_entities(
        func.avg(Patient.age)
    ).scalar()

    average_glucose = health_record_query.with_entities(
        func.avg(HealthRecord.glucose)
    ).scalar()

    average_blood_pressure = health_record_query.with_entities(
        func.avg(HealthRecord.blood_pressure)
    ).scalar()

    average_bmi = health_record_query.with_entities(
        func.avg(HealthRecord.bmi)
    ).scalar()

    average_cholesterol = health_record_query.with_entities(
        func.avg(HealthRecord.cholesterol)
    ).scalar()

    average_heart_rate = health_record_query.with_entities(
        func.avg(HealthRecord.heart_rate)
    ).scalar()

    return {
        "total_patients": total_patients or 0,
        "total_health_records": total_health_records or 0,
        "average_age": (
            round(float(average_age), 2)
            if average_age is not None
            else None
        ),
        "average_glucose": (
            round(float(average_glucose), 2)
            if average_glucose is not None
            else None
        ),
        "average_blood_pressure": (
            round(float(average_blood_pressure), 2)
            if average_blood_pressure is not None
            else None
        ),
        "average_bmi": (
            round(float(average_bmi), 2)
            if average_bmi is not None
            else None
        ),
        "average_cholesterol": (
            round(float(average_cholesterol), 2)
            if average_cholesterol is not None
            else None
        ),
        "average_heart_rate": (
            round(float(average_heart_rate), 2)
            if average_heart_rate is not None
            else None
        )
    }


def get_risk_distribution(
    db: Session,
    current_user
):
    prediction_query = get_accessible_predictions_query(
        db=db,
        current_user=current_user
    )

    rows = (
        prediction_query
        .with_entities(
            RiskPrediction.risk,
            func.count(RiskPrediction.id)
        )
        .group_by(RiskPrediction.risk)
        .all()
    )

    distribution = {
        "low": 0,
        "medium": 0,
        "high": 0
    }

    for risk, count in rows:
        if risk in distribution:
            distribution[risk] = count
        else:
            distribution[risk] = count

    return distribution


def detect_outliers(
    db: Session,
    current_user
):
    records = (
        get_accessible_health_records_query(
            db=db,
            current_user=current_user
        )
        .all()
    )

    if not records:
        return []

    outlier_records = []

    for field in NUMERIC_FIELDS:

        values = [
            getattr(record, field)
            for record in records
            if getattr(record, field) is not None
        ]

        if len(values) < 4:
            continue

        values.sort()

        q1_index = int(
            0.25 * (len(values) - 1)
        )

        q3_index = int(
            0.75 * (len(values) - 1)
        )

        q1 = values[q1_index]
        q3 = values[q3_index]

        iqr = q3 - q1

        lower_limit = q1 - (1.5 * iqr)
        upper_limit = q3 + (1.5 * iqr)

        for record in records:

            value = getattr(
                record,
                field
            )

            if value is None:
                continue

            if (
                value < lower_limit
                or value > upper_limit
            ):
                outlier_records.append({
                    "record_id": record.id,
                    "patient_id": record.patient_id,
                    "field": field,
                    "value": value,
                    "lower_limit": round(
                        lower_limit,
                        2
                    ),
                    "upper_limit": round(
                        upper_limit,
                        2
                    )
                })

    return outlier_records