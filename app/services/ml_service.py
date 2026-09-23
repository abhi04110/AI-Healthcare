import os

import joblib
import pandas as pd

from sqlalchemy.orm import Session

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report
)

from app.models import (
    Patient,
    HealthRecord
)


MODEL_DIR = "ml_models"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "health_risk_model.joblib"
)


FEATURES = [
    "age",
    "glucose",
    "blood_pressure",
    "bmi",
    "cholesterol",
    "heart_rate"
]


TARGET = "risk_label"


VALID_LABELS = {
    "low",
    "medium",
    "high"
}


def get_training_records(
    db: Session
):
    records = (
        db.query(
            Patient.age,
            HealthRecord.glucose,
            HealthRecord.blood_pressure,
            HealthRecord.bmi,
            HealthRecord.cholesterol,
            HealthRecord.heart_rate,
            HealthRecord.risk_label
        )
        .join(
            HealthRecord,
            Patient.id == HealthRecord.patient_id
        )
        .filter(
            HealthRecord.risk_label.isnot(None),
            HealthRecord.glucose.isnot(None),
            HealthRecord.blood_pressure.isnot(None),
            HealthRecord.bmi.isnot(None),
            HealthRecord.cholesterol.isnot(None),
            HealthRecord.heart_rate.isnot(None)
        )
        .all()
    )

    return records


def get_training_data_summary(
    db: Session
):
    records = get_training_records(
        db=db
    )

    if not records:
        return {
            "total_labelled_records": 0,
            "complete_records": 0,
            "risk_class_distribution": {},
            "ready_for_training": False
        }

    data = pd.DataFrame(
        records,
        columns=FEATURES + [TARGET]
    )

    data[TARGET] = (
        data[TARGET]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    valid_records = data[
        data[TARGET].isin(
            VALID_LABELS
        )
    ]

    class_counts = (
        valid_records[TARGET]
        .value_counts()
        .to_dict()
    )

    minimum_class_count = (
        min(class_counts.values())
        if class_counts
        else 0
    )

    ready_for_training = (
        len(valid_records) >= 10
        and len(class_counts) >= 2
        and minimum_class_count >= 2
    )

    return {
        "total_labelled_records": len(data),
        "complete_records": len(valid_records),
        "risk_class_distribution": {
            str(label): int(count)
            for label, count in class_counts.items()
        },
        "minimum_records_required": 10,
        "minimum_records_per_class": 2,
        "ready_for_training": ready_for_training
    }


def train_risk_model(
    db: Session
):
    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    records = get_training_records(
        db=db
    )

    if not records:
        raise ValueError(
            "No complete labelled health records found in PostgreSQL"
        )

    data = pd.DataFrame(
        records,
        columns=FEATURES + [TARGET]
    )

    data[TARGET] = (
        data[TARGET]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    invalid_labels = (
        set(data[TARGET].unique())
        - VALID_LABELS
    )

    if invalid_labels:
        raise ValueError(
            f"Invalid risk labels found: {invalid_labels}"
        )

    if len(data) < 10:
        raise ValueError(
            "At least 10 complete labelled health records are required"
        )

    class_counts = (
        data[TARGET]
        .value_counts()
    )

    if len(class_counts) < 2:
        raise ValueError(
            "At least 2 different risk classes are required"
        )

    if class_counts.min() < 2:
        raise ValueError(
            "Each risk class must contain at least 2 records"
        )

    X = data[FEATURES]

    y = data[TARGET]

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y
        )
    )

    model = RandomForestClassifier(
        n_estimators=200,
        random_state=42
    )

    model.fit(
        X_train,
        y_train
    )

    predictions = model.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    report = classification_report(
        y_test,
        predictions,
        output_dict=True,
        zero_division=0
    )

    joblib.dump(
        model,
        MODEL_PATH
    )

    return {
        "message": (
            "Risk prediction model trained successfully "
            "from PostgreSQL data"
        ),
        "data_source": (
            "PostgreSQL health_records"
        ),
        "model_path": MODEL_PATH,
        "total_records_used": len(data),
        "training_samples": len(X_train),
        "testing_samples": len(X_test),
        "risk_class_distribution": {
            str(label): int(count)
            for label, count in class_counts.items()
        },
        "accuracy": round(
            float(accuracy),
            4
        ),
        "classification_report": report
    }


def load_risk_model():

    if not os.path.exists(
        MODEL_PATH
    ):
        raise FileNotFoundError(
            "Trained risk model not found. "
            "Train the model first."
        )

    return joblib.load(
        MODEL_PATH
    )


def predict_risk(
    age: int,
    glucose: float,
    blood_pressure: float,
    bmi: float,
    cholesterol: float,
    heart_rate: float
):
    model = load_risk_model()

    input_data = pd.DataFrame(
        [[
            age,
            glucose,
            blood_pressure,
            bmi,
            cholesterol,
            heart_rate
        ]],
        columns=FEATURES
    )

    prediction = model.predict(
        input_data
    )[0]

    probabilities = (
        model.predict_proba(
            input_data
        )[0]
    )

    classes = model.classes_

    confidence = max(
        probabilities
    )

    probability_details = {
        str(label): round(
            float(probability),
            4
        )
        for label, probability
        in zip(
            classes,
            probabilities
        )
    }

    return {
        "risk": str(prediction),
        "confidence": round(
            float(confidence),
            4
        ),
        "probabilities": probability_details
    }