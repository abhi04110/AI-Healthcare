from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Patient, HealthRecord


NUMERIC_FIELDS = [
    "glucose",
    "blood_pressure",
    "bmi",
    "cholesterol",
    "heart_rate"
]


def get_basic_analytics(
    db: Session
):
    total_patients = db.query(
        func.count(Patient.id)
    ).scalar()

    total_health_records = db.query(
        func.count(HealthRecord.id)
    ).scalar()

    average_age = db.query(
        func.avg(Patient.age)
    ).scalar()

    average_glucose = db.query(
        func.avg(HealthRecord.glucose)
    ).scalar()

    average_blood_pressure = db.query(
        func.avg(HealthRecord.blood_pressure)
    ).scalar()

    average_bmi = db.query(
        func.avg(HealthRecord.bmi)
    ).scalar()

    average_cholesterol = db.query(
        func.avg(HealthRecord.cholesterol)
    ).scalar()

    average_heart_rate = db.query(
        func.avg(HealthRecord.heart_rate)
    ).scalar()

    return {
        "total_patients": total_patients or 0,
        "total_health_records": total_health_records or 0,
        "average_age": round(
            float(average_age),
            2
        ) if average_age is not None else None,
        "average_glucose": round(
            float(average_glucose),
            2
        ) if average_glucose is not None else None,
        "average_blood_pressure": round(
            float(average_blood_pressure),
            2
        ) if average_blood_pressure is not None else None,
        "average_bmi": round(
            float(average_bmi),
            2
        ) if average_bmi is not None else None,
        "average_cholesterol": round(
            float(average_cholesterol),
            2
        ) if average_cholesterol is not None else None,
        "average_heart_rate": round(
            float(average_heart_rate),
            2
        ) if average_heart_rate is not None else None
    }


def detect_outliers(
    db: Session
):
    records = db.query(
        HealthRecord
    ).all()

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

        dataframe = {
            "values": values
        }

        q1 = values[
            len(values) // 4
        ]

        q3 = values[
            (3 * len(values)) // 4
        ]

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