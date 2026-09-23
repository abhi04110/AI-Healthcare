import pandas as pd

from sklearn.cluster import (
    KMeans,
    DBSCAN,
    AgglomerativeClustering
)
from sklearn.preprocessing import StandardScaler

from sqlalchemy.orm import Session

from app.models import Patient, HealthRecord


FEATURES = [
    "age",
    "glucose",
    "blood_pressure",
    "bmi",
    "cholesterol",
    "heart_rate"
]


def get_latest_patient_records(
    db: Session,
    current_user
):
    patient_query = db.query(Patient)

    if current_user.role != "admin":
        patient_query = patient_query.filter(
            Patient.created_by == current_user.id
        )

    patients = patient_query.all()

    patient_records = []

    for patient in patients:

        health_record = (
            db.query(HealthRecord)
            .filter(
                HealthRecord.patient_id == patient.id
            )
            .order_by(
                HealthRecord.created_at.desc(),
                HealthRecord.id.desc()
            )
            .first()
        )

        if not health_record:
            continue

        values = {
            "age": patient.age,
            "glucose": health_record.glucose,
            "blood_pressure": health_record.blood_pressure,
            "bmi": health_record.bmi,
            "cholesterol": health_record.cholesterol,
            "heart_rate": health_record.heart_rate
        }

        if any(
            value is None
            for value in values.values()
        ):
            continue

        patient_records.append({
            "patient_id": patient.id,
            "patient_code": patient.patient_code,
            "patient_name": patient.name,
            **values
        })

    return patient_records


def prepare_database_data(
    db: Session,
    current_user
):
    records = get_latest_patient_records(
        db=db,
        current_user=current_user
    )

    if len(records) < 3:
        raise ValueError(
            "At least 3 patients with complete health records are required for clustering"
        )

    dataframe = pd.DataFrame(records)

    feature_data = dataframe[FEATURES]

    scaler = StandardScaler()

    scaled_data = scaler.fit_transform(
        feature_data
    )

    return dataframe, scaled_data


def kmeans_database_clustering(
    db: Session,
    current_user,
    n_clusters: int = 3
):
    if n_clusters < 2:
        raise ValueError(
            "n_clusters must be at least 2"
        )

    dataframe, scaled_data = prepare_database_data(
        db=db,
        current_user=current_user
    )

    if n_clusters > len(dataframe):
        raise ValueError(
            "n_clusters cannot be greater than number of patients"
        )

    model = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10
    )

    labels = model.fit_predict(
        scaled_data
    )

    dataframe["cluster"] = labels

    return dataframe[
        [
            "patient_id",
            "patient_code",
            "patient_name",
            "cluster"
        ]
    ].to_dict(
        orient="records"
    )


def dbscan_database_clustering(
    db: Session,
    current_user,
    eps: float = 1.5,
    min_samples: int = 2
):
    if eps <= 0:
        raise ValueError(
            "eps must be greater than 0"
        )

    if min_samples < 1:
        raise ValueError(
            "min_samples must be at least 1"
        )

    dataframe, scaled_data = prepare_database_data(
        db=db,
        current_user=current_user
    )

    model = DBSCAN(
        eps=eps,
        min_samples=min_samples
    )

    labels = model.fit_predict(
        scaled_data
    )

    dataframe["cluster"] = labels

    return dataframe[
        [
            "patient_id",
            "patient_code",
            "patient_name",
            "cluster"
        ]
    ].to_dict(
        orient="records"
    )


def hierarchical_database_clustering(
    db: Session,
    current_user,
    n_clusters: int = 3
):
    if n_clusters < 2:
        raise ValueError(
            "n_clusters must be at least 2"
        )

    dataframe, scaled_data = prepare_database_data(
        db=db,
        current_user=current_user
    )

    if n_clusters > len(dataframe):
        raise ValueError(
            "n_clusters cannot be greater than number of patients"
        )

    model = AgglomerativeClustering(
        n_clusters=n_clusters
    )

    labels = model.fit_predict(
        scaled_data
    )

    dataframe["cluster"] = labels

    return dataframe[
        [
            "patient_id",
            "patient_code",
            "patient_name",
            "cluster"
        ]
    ].to_dict(
        orient="records"
    )