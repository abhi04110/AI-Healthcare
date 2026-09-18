import os

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


DATASET_PATH = "datasets/health_risk_dataset.csv"
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

TARGET = "risk"


def train_risk_model():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    data = pd.read_csv(
        DATASET_PATH
    )

    required_columns = FEATURES + [TARGET]

    missing_columns = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing dataset columns: {missing_columns}"
        )

    data = data.dropna(
        subset=required_columns
    )

    X = data[FEATURES]
    y = data[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
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

    joblib.dump(
        model,
        MODEL_PATH
    )

    return {
        "message": "Risk prediction model trained successfully",
        "model_path": MODEL_PATH,
        "accuracy": round(
            float(accuracy),
            4
        ),
        "training_samples": len(X_train),
        "testing_samples": len(X_test),
        "classification_report": classification_report(
            y_test,
            predictions,
            output_dict=True
        )
    }


def load_risk_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "Trained risk model not found. Train the model first."
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

    probabilities = model.predict_proba(
        input_data
    )[0]

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
        in zip(classes, probabilities)
    }

    return {
        "risk": str(prediction),
        "confidence": round(
            float(confidence),
            4
        ),
        "probabilities": probability_details
    }