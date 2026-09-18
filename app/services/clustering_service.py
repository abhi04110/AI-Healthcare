import pandas as pd

from sklearn.cluster import (
    KMeans,
    DBSCAN,
    AgglomerativeClustering
)

from sklearn.preprocessing import StandardScaler


FEATURES = [
    "age",
    "glucose",
    "blood_pressure",
    "bmi",
    "cholesterol",
    "heart_rate"
]


def prepare_data(data: list[dict]):

    dataframe = pd.DataFrame(
        data
    )

    missing_columns = [
        column
        for column in FEATURES
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    dataframe = dataframe[FEATURES].dropna()

    if len(dataframe) < 3:
        raise ValueError(
            "At least 3 patient records are required"
        )

    scaler = StandardScaler()

    scaled_data = scaler.fit_transform(
        dataframe
    )

    return dataframe, scaled_data


def kmeans_clustering(
    data: list[dict],
    n_clusters: int = 3
):

    if n_clusters < 2:
        raise ValueError(
            "n_clusters must be at least 2"
        )

    dataframe, scaled_data = prepare_data(
        data
    )

    if n_clusters > len(dataframe):
        raise ValueError(
            "n_clusters cannot be greater than number of records"
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

    return dataframe.to_dict(
        orient="records"
    )


def dbscan_clustering(
    data: list[dict],
    eps: float = 1.5,
    min_samples: int = 2
):

    dataframe, scaled_data = prepare_data(
        data
    )

    model = DBSCAN(
        eps=eps,
        min_samples=min_samples
    )

    labels = model.fit_predict(
        scaled_data
    )

    dataframe["cluster"] = labels

    return dataframe.to_dict(
        orient="records"
    )


def hierarchical_clustering(
    data: list[dict],
    n_clusters: int = 3
):

    if n_clusters < 2:
        raise ValueError(
            "n_clusters must be at least 2"
        )

    dataframe, scaled_data = prepare_data(
        data
    )

    if n_clusters > len(dataframe):
        raise ValueError(
            "n_clusters cannot be greater than number of records"
        )

    model = AgglomerativeClustering(
        n_clusters=n_clusters
    )

    labels = model.fit_predict(
        scaled_data
    )

    dataframe["cluster"] = labels

    return dataframe.to_dict(
        orient="records"
    )