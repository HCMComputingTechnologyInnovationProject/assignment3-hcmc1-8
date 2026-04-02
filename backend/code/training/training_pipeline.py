from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DATASET_PATH = BACKEND_ROOT / "data" / "raw" / "train_transaction.csv"
RESULTS_DIR = BACKEND_ROOT / "results"
MODELS_DIR = RESULTS_DIR / "models"
METRICS_DIR = RESULTS_DIR / "metrics"
FIGURES_DIR = RESULTS_DIR / "figures"

FEATURE_COLUMNS = ["TransactionAmt", "TransactionDT", "ProductCD"]
TARGET_COLUMN = "isFraud"
DEFAULT_SAMPLE_ROWS = 100_000
DEFAULT_TEST_SIZE = 0.2
DEFAULT_RANDOM_STATE = 42


@dataclass(frozen=True)
class ModelConfig:
    key: str
    display_name: str
    artifact_name: str
    builder: Callable[[], Any]
    supervised: bool
    supports_probability: bool


MODEL_CONFIGS = {
    "logistic_regression": ModelConfig(
        key="logistic_regression",
        display_name="Logistic Regression",
        artifact_name="model1_logistic_regression.pkl",
        builder=lambda: LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=DEFAULT_RANDOM_STATE,
        ),
        supervised=True,
        supports_probability=True,
    ),
    "isolation_forest": ModelConfig(
        key="isolation_forest",
        display_name="Isolation Forest",
        artifact_name="model2_isolation_forest.pkl",
        builder=lambda: IsolationForest(
            n_estimators=200,
            contamination=0.03,
            random_state=DEFAULT_RANDOM_STATE,
        ),
        supervised=False,
        supports_probability=False,
    ),
    "random_forest": ModelConfig(
        key="random_forest",
        display_name="Random Forest",
        artifact_name="model3_random_forest.pkl",
        builder=lambda: RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=DEFAULT_RANDOM_STATE,
            n_jobs=1,
        ),
        supervised=True,
        supports_probability=True,
    ),
    "xgboost": ModelConfig(
        key="xgboost",
        display_name="XGBoost",
        artifact_name="model4_xgboost.pkl",
        builder=lambda: XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=DEFAULT_RANDOM_STATE,
            eval_metric="logloss",
            n_jobs=1,
        ),
        supervised=True,
        supports_probability=True,
    ),
}


def ensure_output_dirs() -> None:
    for directory in (RESULTS_DIR, MODELS_DIR, METRICS_DIR, FIGURES_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def normalize_rows(rows: int | None) -> int | None:
    if rows is None or rows <= 0:
        return None
    return rows


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                ["TransactionAmt", "TransactionDT"],
            ),
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                ["ProductCD"],
            ),
        ]
    )


def load_training_frame(rows: int | None = DEFAULT_SAMPLE_ROWS) -> pd.DataFrame:
    selected_rows = normalize_rows(rows)
    usecols = [TARGET_COLUMN, *FEATURE_COLUMNS]
    frame = pd.read_csv(DATASET_PATH, usecols=usecols, nrows=selected_rows)
    frame = frame.dropna(subset=[TARGET_COLUMN]).copy()
    frame[TARGET_COLUMN] = frame[TARGET_COLUMN].astype(int)
    return frame


def build_shared_split(
    rows: int | None = DEFAULT_SAMPLE_ROWS,
    test_size: float = DEFAULT_TEST_SIZE,
    random_state: int = DEFAULT_RANDOM_STATE,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, dict[str, Any]]:
    frame = load_training_frame(rows)
    X = frame[FEATURE_COLUMNS].copy()
    y = frame[TARGET_COLUMN].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    split_summary = {
        "dataset_path": str(DATASET_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "sample_rows_loaded": int(len(frame)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "test_size": test_size,
        "random_state": random_state,
        "fraud_rate_train": float(y_train.mean()),
        "fraud_rate_test": float(y_test.mean()),
    }
    return X_train, X_test, y_train, y_test, split_summary


def summarize_feature_importance(fitted_pipeline: Pipeline) -> list[dict[str, float]]:
    model = fitted_pipeline.named_steps["model"]
    preprocessor = fitted_pipeline.named_steps["preprocess"]
    transformed_names = preprocessor.get_feature_names_out()

    if hasattr(model, "feature_importances_"):
        raw_importance = np.asarray(model.feature_importances_, dtype=float)
    elif hasattr(model, "coef_"):
        raw_importance = np.abs(np.asarray(model.coef_, dtype=float)).mean(axis=0)
    else:
        return []

    aggregated: dict[str, float] = {feature: 0.0 for feature in FEATURE_COLUMNS}
    for name, score in zip(transformed_names, raw_importance):
        normalized_name = str(name).split("__", 1)[-1]
        matched_feature = next(
            (feature for feature in FEATURE_COLUMNS if normalized_name == feature or normalized_name.startswith(f"{feature}_")),
            None,
        )
        if matched_feature is not None:
            aggregated[matched_feature] += float(score)

    total = sum(aggregated.values())
    if total <= 0:
        return []

    return [
        {"name": feature, "value": round((score / total) * 100, 2)}
        for feature, score in sorted(aggregated.items(), key=lambda item: item[1], reverse=True)
    ]


def compute_metrics(
    config: ModelConfig,
    y_test: pd.Series,
    predictions: np.ndarray,
    scores: np.ndarray | None,
    split_summary: dict[str, Any],
    feature_importance: list[dict[str, float]] | None = None,
) -> dict[str, Any]:
    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y_test, predictions, labels=[0, 1]).ravel()

    metrics: dict[str, Any] = {
        "name": config.display_name,
        "model_key": config.key,
        "artifact": config.artifact_name,
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1_score": float(f1_score(y_test, predictions, zero_division=0)),
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
        "classification_report": report,
        "split": split_summary,
        "feature_importance": feature_importance or [],
        "supports_probability": config.supports_probability,
    }

    if scores is not None and len(np.unique(y_test)) > 1:
        metrics["auc_roc"] = float(roc_auc_score(y_test, scores))
    else:
        metrics["auc_roc"] = None

    return metrics


def save_metrics_artifact(config: ModelConfig, metrics: dict[str, Any]) -> None:
    metrics_path = METRICS_DIR / f"{Path(config.artifact_name).stem}_metrics.json"
    with metrics_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)


def save_model_artifact(config: ModelConfig, payload: dict[str, Any]) -> None:
    joblib.dump(payload, MODELS_DIR / config.artifact_name)


def train_supervised_model(
    config: ModelConfig,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    split_summary: dict[str, Any],
) -> dict[str, Any]:
    pipeline = Pipeline(
        steps=[
            ("preprocess", build_preprocessor()),
            ("model", config.builder()),
        ]
    )
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    probability_scores = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, "predict_proba") else None
    feature_importance = summarize_feature_importance(pipeline)

    metrics = compute_metrics(
        config=config,
        y_test=y_test,
        predictions=np.asarray(predictions),
        scores=np.asarray(probability_scores) if probability_scores is not None else None,
        split_summary=split_summary,
        feature_importance=feature_importance,
    )
    save_model_artifact(
        config,
        {
            "model": pipeline,
            "feature_columns": FEATURE_COLUMNS,
            "target_column": TARGET_COLUMN,
            "display_name": config.display_name,
            "model_key": config.key,
            "feature_importance": feature_importance,
            "split": split_summary,
        },
    )
    save_metrics_artifact(config, metrics)
    return metrics


def train_isolation_forest(
    config: ModelConfig,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    split_summary: dict[str, Any],
) -> dict[str, Any]:
    preprocessor = build_preprocessor()
    transformed_train = preprocessor.fit_transform(X_train)
    transformed_test = preprocessor.transform(X_test)

    legitimate_train = transformed_train[y_train.to_numpy() == 0]
    training_input = legitimate_train if len(legitimate_train) > 0 else transformed_train

    anomaly_model: IsolationForest = config.builder()
    anomaly_model.fit(training_input)

    raw_predictions = anomaly_model.predict(transformed_test)
    predictions = np.where(raw_predictions == -1, 1, 0)
    anomaly_scores = -anomaly_model.score_samples(transformed_test)

    metrics = compute_metrics(
        config=config,
        y_test=y_test,
        predictions=predictions,
        scores=anomaly_scores,
        split_summary=split_summary,
    )
    save_model_artifact(
        config,
        {
            "model": anomaly_model,
            "preprocessor": preprocessor,
            "feature_columns": FEATURE_COLUMNS,
            "target_column": TARGET_COLUMN,
            "display_name": config.display_name,
            "model_key": config.key,
            "split": split_summary,
        },
    )
    save_metrics_artifact(config, metrics)
    return metrics


def train_model_by_key(
    model_key: str,
    rows: int | None = DEFAULT_SAMPLE_ROWS,
    test_size: float = DEFAULT_TEST_SIZE,
    random_state: int = DEFAULT_RANDOM_STATE,
) -> dict[str, Any]:
    ensure_output_dirs()
    config = MODEL_CONFIGS[model_key]
    X_train, X_test, y_train, y_test, split_summary = build_shared_split(
        rows=rows,
        test_size=test_size,
        random_state=random_state,
    )

    if config.supervised:
        metrics = train_supervised_model(config, X_train, X_test, y_train, y_test, split_summary)
    else:
        metrics = train_isolation_forest(config, X_train, X_test, y_train, y_test, split_summary)

    print(f"\n{config.display_name}")
    print(f"Train rows: {split_summary['train_rows']:,}")
    print(f"Test rows:  {split_summary['test_rows']:,}")
    print(f"Precision:  {metrics['precision']:.4f}")
    print(f"Recall:     {metrics['recall']:.4f}")
    print(f"F1-score:   {metrics['f1_score']:.4f}")
    print(f"Accuracy:   {metrics['accuracy']:.4f}")
    if metrics["auc_roc"] is not None:
        print(f"AUC-ROC:    {metrics['auc_roc']:.4f}")
    print(f"Model saved to: {MODELS_DIR / config.artifact_name}")
    print(f"Metrics saved to: {METRICS_DIR / f'{Path(config.artifact_name).stem}_metrics.json'}")
    return metrics


def train_all_models(
    rows: int | None = DEFAULT_SAMPLE_ROWS,
    test_size: float = DEFAULT_TEST_SIZE,
    random_state: int = DEFAULT_RANDOM_STATE,
) -> list[dict[str, Any]]:
    ensure_output_dirs()
    X_train, X_test, y_train, y_test, split_summary = build_shared_split(
        rows=rows,
        test_size=test_size,
        random_state=random_state,
    )

    split_path = METRICS_DIR / "dataset_split_summary.json"
    with split_path.open("w", encoding="utf-8") as handle:
        json.dump(split_summary, handle, indent=2)

    comparison: list[dict[str, Any]] = []
    for model_key in ("logistic_regression", "isolation_forest", "random_forest", "xgboost"):
        config = MODEL_CONFIGS[model_key]
        if config.supervised:
            metrics = train_supervised_model(config, X_train, X_test, y_train, y_test, split_summary)
        else:
            metrics = train_isolation_forest(config, X_train, X_test, y_train, y_test, split_summary)
        comparison.append(metrics)

        print(
            f"{config.display_name}: precision={metrics['precision']:.4f}, "
            f"recall={metrics['recall']:.4f}, f1={metrics['f1_score']:.4f}"
        )

    comparison_path = METRICS_DIR / "comparison.json"
    with comparison_path.open("w", encoding="utf-8") as handle:
        json.dump(comparison, handle, indent=2)

    best_probability_model = max(
        (metric for metric in comparison if metric["supports_probability"]),
        key=lambda item: item["f1_score"],
    )
    deployment_path = METRICS_DIR / "deployment_target.json"
    with deployment_path.open("w", encoding="utf-8") as handle:
        json.dump(best_probability_model, handle, indent=2)

    print(f"\nShared split summary saved to: {split_path}")
    print(f"Model comparison saved to: {comparison_path}")
    print(f"Recommended deployment model: {best_probability_model['name']}")
    return comparison


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train fraud-detection models on a shared test split.")
    parser.add_argument(
        "--rows",
        type=int,
        default=DEFAULT_SAMPLE_ROWS,
        help="Number of rows to load from backend/data/raw/train_transaction.csv. Use 0 for the full file.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=DEFAULT_TEST_SIZE,
        help="Shared test split ratio for all models.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=DEFAULT_RANDOM_STATE,
        help="Random state for reproducible train/test splits.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    train_all_models(
        rows=args.rows,
        test_size=args.test_size,
        random_state=args.random_state,
    )


if __name__ == "__main__":
    main()
