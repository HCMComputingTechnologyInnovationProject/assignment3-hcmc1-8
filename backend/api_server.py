from __future__ import annotations

import json
import os
import re
import socket
import sqlite3
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
import pandas as pd
import requests as http_requests
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.exceptions import InconsistentVersionWarning


APP_ROOT = Path(__file__).resolve().parent
RESULTS_ROOT = APP_ROOT / "results"
MODELS_ROOT = RESULTS_ROOT / "models"
METRICS_ROOT = RESULTS_ROOT / "metrics"
DATASET_PATH = APP_ROOT / "data" / "test" / "test_transactions.csv"
PREDICTIONS_DB_PATH = APP_ROOT / "data" / "predictions.db"
DATASET_EPOCH = datetime(2017, 12, 1, tzinfo=timezone.utc)
DATASET_SAMPLE_ROWS = 150_000
PRODUCT_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"]
PREDICTION_MODEL_ORDER = ["xgboost", "random_forest", "logistic_regression", "isolation_forest"]
INFERENCE_FEATURE_COLUMNS = ["TransactionAmt", "TransactionDT", "ProductCD"]
MODEL_DISPLAY_NAMES = {
    "xgboost": "XGBoost",
    "random_forest": "Random Forest",
    "logistic_regression": "Logistic Regression",
    "isolation_forest": "Isolation Forest",
}
MODEL_METRICS_FILES = {
    "xgboost": "model4_xgboost_metrics.json",
    "random_forest": "model3_random_forest_metrics.json",
    "logistic_regression": "model1_logistic_regression_metrics.json",
    "isolation_forest": "model2_isolation_forest_metrics.json",
}
MODEL_ARTIFACT_FILES = {
    "xgboost": "model4_xgboost.pkl",
    "random_forest": "model3_random_forest.pkl",
    "logistic_regression": "model1_logistic_regression.pkl",
    "isolation_forest": "model2_isolation_forest.pkl",
}

DATASET_COLUMNS = [
    "TransactionID",
    "TransactionDT",
    "TransactionAmt",
    "ProductCD",
    "card4",
    "isFraud",
]

PRODUCT_LABEL_MAP = {
    "W": "Web (Online)",
    "H": "Handheld (Mobile)",
    "R": "Retail (Store)",
    "S": "Surface (In-person)",
    "C": "Credit (Transaction)",
    "Unknown": "Unknown Category"
}

app = FastAPI(title="SentinelAI API", description="Real fraud analytics and model inference API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_artifacts: dict[str, Any] = {}
model_registry: dict[str, dict[str, Any]] = {}
global_historical_frame: pd.DataFrame | None = None
global_predictions_frame: pd.DataFrame | None = None
global_combined_frame: pd.DataFrame | None = None
cached_risk_stats: dict[str, Any] = {}
_system_prompt_cache: dict[str, Any] = {"prompt": "", "ts": 0.0}
_PROMPT_CACHE_SECONDS = 300  # 5 minutes


def invalidate_system_prompt_cache() -> None:
    _system_prompt_cache["prompt"] = ""
    _system_prompt_cache["ts"] = 0.0


def build_combined_frame() -> None:
    global global_combined_frame
    if global_historical_frame is None:
        return

    if global_predictions_frame is None or global_predictions_frame.empty:
        global_combined_frame = global_historical_frame.copy()
    else:
        global_combined_frame = pd.concat([global_historical_frame, global_predictions_frame], ignore_index=True)

    refresh_risk_stats(global_combined_frame)
    invalidate_system_prompt_cache()


def refresh_risk_stats(frame: pd.DataFrame) -> None:
    global cached_risk_stats
    if frame.empty:
        cached_risk_stats = {
            "amount_p95": 0.0,
            "baseline_fraud_rate": 0.0,
            "product_fraud_rates": {},
        }
        return

    cached_risk_stats = {
        "amount_p95": float(frame["TransactionAmt"].quantile(0.95)),
        "baseline_fraud_rate": overall_fraud_rate(frame),
        "product_fraud_rates": product_fraud_rates(frame),
    }



class PredictionInput(BaseModel):
    amount: float = Field(..., gt=0)
    transaction_dt: int = Field(..., ge=0, description="Seconds since the dataset reference start time.")
    product_code: str = Field(..., min_length=1, max_length=8)
    model_id: str = Field(default="xgboost", description="The ID of the model to use for prediction.")


class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)


def ensure_storage() -> None:
    PREDICTIONS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(PREDICTIONS_DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                transaction_dt INTEGER NOT NULL,
                amount REAL NOT NULL,
                product_code TEXT NOT NULL,
                card_brand TEXT NOT NULL,
                is_fraud INTEGER NOT NULL,
                fraud_probability REAL NOT NULL,
                risk_score INTEGER NOT NULL,
                status TEXT NOT NULL,
                source TEXT NOT NULL
            )
            """
        )
        connection.commit()


def load_historical_transactions() -> pd.DataFrame:
    frame = pd.read_csv(DATASET_PATH, usecols=DATASET_COLUMNS, nrows=DATASET_SAMPLE_ROWS)
    frame["TransactionID"] = frame["TransactionID"].astype(str)
    frame["TransactionDT"] = pd.to_numeric(frame["TransactionDT"], errors="coerce").fillna(0).astype(int)
    frame["TransactionAmt"] = pd.to_numeric(frame["TransactionAmt"], errors="coerce").fillna(0.0)
    frame["ProductCD"] = frame["ProductCD"].fillna("Unknown").astype(str)
    frame["card4"] = frame["card4"].fillna("Unknown").astype(str)
    frame["isFraud"] = pd.to_numeric(frame["isFraud"], errors="coerce").fillna(0).astype(int)
    return frame


def resolve_deployment_artifact(model_id: str = "xgboost") -> Path | None:
    metrics = load_model_metrics(model_id)
    artifact_name = str(metrics.get("artifact") or MODEL_ARTIFACT_FILES.get(model_id, ""))
    candidate = MODELS_ROOT / artifact_name
    return candidate if candidate.exists() else None


def model_display_name(model_id: str) -> str:
    return MODEL_DISPLAY_NAMES.get(model_id, model_id.replace("_", " ").title())


def load_model_metrics(model_id: str) -> dict[str, Any]:
    metrics_name = MODEL_METRICS_FILES.get(model_id)
    if not metrics_name:
        return {}

    metrics_path = METRICS_ROOT / metrics_name
    if not metrics_path.exists():
        return {}

    try:
        return json.loads(metrics_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def deployment_target_model_id() -> str:
    deployment_path = METRICS_ROOT / "deployment_target.json"
    if not deployment_path.exists():
        return ""

    try:
        payload = json.loads(deployment_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return ""

    return str(payload.get("model_key") or "")


def normalize_feature_names(raw_names: Any) -> list[str]:
    if raw_names is None:
        return []
    return [str(name) for name in list(raw_names)]


def artifact_expected_features(artifact: dict[str, Any]) -> list[str]:
    candidates = [
        artifact.get("feature_columns"),
        getattr(artifact.get("model"), "feature_names_in_", None),
        getattr(artifact.get("preprocessor"), "feature_names_in_", None),
        getattr(artifact.get("scaler"), "feature_names_in_", None),
        artifact.get("feature_names"),
    ]
    for candidate in candidates:
        normalized = normalize_feature_names(candidate)
        if normalized:
            return normalized
    return []


def validate_artifact_for_prediction(model_id: str, artifact: dict[str, Any]) -> tuple[bool, list[str], str]:
    expected_features = artifact_expected_features(artifact)
    if not expected_features:
        return (
            False,
            [],
            f"{model_display_name(model_id)} does not expose an input feature signature, so the API cannot safely score live requests.",
        )

    if expected_features != INFERENCE_FEATURE_COLUMNS:
        return (
            False,
            expected_features,
            (
                f"{model_display_name(model_id)} expects {expected_features}, "
                f"but the API submits {INFERENCE_FEATURE_COLUMNS}."
            ),
        )

    return True, expected_features, ""


def prediction_model_options() -> list[dict[str, str]]:
    available_entries = [
        model_registry[model_id]
        for model_id in PREDICTION_MODEL_ORDER
        if model_registry.get(model_id, {}).get("available", False)
    ]
    available_entries.sort(key=lambda entry: float(entry.get("f1_score") or -1.0), reverse=True)
    return [{"id": entry["id"], "label": entry["label"]} for entry in available_entries]


def default_prediction_model_id() -> str:
    deployment_model_id = deployment_target_model_id()
    if model_registry.get(deployment_model_id, {}).get("available", False):
        return deployment_model_id
    options = prediction_model_options()
    return options[0]["id"] if options else ""


def require_prediction_artifact(model_id: str) -> dict[str, Any]:
    artifact = model_artifacts.get(model_id)
    if artifact is not None:
        return artifact

    entry = model_registry.get(model_id)
    available_models = [item["id"] for item in prediction_model_options()]
    available_suffix = f" Available models: {available_models}." if available_models else ""

    if entry is None:
        raise HTTPException(status_code=404, detail=f"Unknown model_id '{model_id}'.{available_suffix}")

    status = entry.get("status")
    if status == "incompatible":
        raise HTTPException(status_code=400, detail=f"{entry['reason']}{available_suffix}")
    if status == "missing":
        raise HTTPException(status_code=503, detail=f"Model artifact '{model_id}' is missing from backend/results/models.")
    if status == "load_error":
        raise HTTPException(status_code=503, detail=f"Model artifact '{model_id}' could not be loaded: {entry['reason']}")

    raise HTTPException(status_code=503, detail=f"Model artifact '{model_id}' is not available for prediction.{available_suffix}")


def transaction_timestamp(transaction_dt: int) -> str:
    timestamp = DATASET_EPOCH + timedelta(seconds=int(transaction_dt))
    return timestamp.isoformat().replace("+00:00", "Z")


def fetch_persisted_predictions(limit: int | None = None) -> list[dict[str, Any]]:
    query = """
        SELECT id, created_at, transaction_dt, amount, product_code, card_brand,
               is_fraud, fraud_probability, risk_score, status, source
        FROM predictions
        ORDER BY created_at DESC, id DESC
    """
    parameters: tuple[Any, ...] = ()
    if limit is not None:
        query += " LIMIT ?"
        parameters = (limit,)

    with sqlite3.connect(PREDICTIONS_DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(query, parameters).fetchall()
    return [dict(row) for row in rows]


def persisted_predictions_frame() -> pd.DataFrame:
    rows = fetch_persisted_predictions()
    if not rows:
        return pd.DataFrame(columns=DATASET_COLUMNS)

    return pd.DataFrame(
        [
            {
                "TransactionID": f"PRED-{row['id']:04d}",
                "TransactionDT": int(row["transaction_dt"]),
                "TransactionAmt": float(row["amount"]),
                "ProductCD": str(row["product_code"]),
                "card4": str(row["card_brand"]),
                "isFraud": int(row["is_fraud"]),
            }
            for row in rows
        ],
        columns=DATASET_COLUMNS,
    )


def combined_transactions_frame() -> pd.DataFrame:
    if global_combined_frame is not None:
        return global_combined_frame
    return pd.DataFrame(columns=DATASET_COLUMNS)


def overall_fraud_rate(frame: pd.DataFrame) -> float:
    if frame.empty:
        return 0.0
    return float(frame["isFraud"].mean())


def product_fraud_rates(frame: pd.DataFrame) -> dict[str, float]:
    if frame.empty:
        return {}
    return frame.groupby("ProductCD")["isFraud"].mean().to_dict()


def compute_risk_score(
    amount: float,
    product_code: str,
    probability: float,
    is_fraud: int,
) -> int:
    # Use cached stats to avoid heavy pandas operations in every record processing call.
    amount_p95 = cached_risk_stats.get("amount_p95", 0.0)
    baseline_fraud_rate = cached_risk_stats.get("baseline_fraud_rate", 0.0)
    product_rate = cached_risk_stats.get("product_fraud_rates", {}).get(product_code, baseline_fraud_rate)

    score = probability * 100
    if amount >= amount_p95:
        score += 8
    if product_rate > baseline_fraud_rate * 1.5:
        score += 7

    if is_fraud:
        score = max(score, 70)
    else:
        score = min(score, 49)

    return int(max(1, min(99, round(score))))


def feature_importance_from_artifact(model_id: str = "xgboost") -> list[dict[str, float]]:
    artifact = model_artifacts.get(model_id)
    if not artifact or "feature_importance" not in artifact:
        return []
    
    raw_importance = artifact["feature_importance"]
    # Return top 10 features for clarity
    sorted_importance = sorted(raw_importance, key=lambda x: x["value"], reverse=True)[:10]
    return [{"name": str(item["name"]), "value": float(item["value"])} for item in sorted_importance]


def infer_prediction(features: pd.DataFrame, model_id: str = "xgboost") -> tuple[int, float]:
    artifact = require_prediction_artifact(model_id)

    model = artifact["model"]
    if "preprocessor" in artifact:
        transformed = artifact["preprocessor"].transform(features)
        raw_prediction = int(model.predict(transformed)[0])
        prediction = 1 if raw_prediction == -1 else 0
        score = float((-model.score_samples(transformed))[0])
        probability = float(max(0.0, min(1.0, score / (score + 1))))
        return prediction, probability

    if "scaler" in artifact:
        transformed = artifact["scaler"].transform(features)
        prediction = int(model.predict(transformed)[0])
        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba(transformed)[0][1])
        elif hasattr(model, "decision_function"):
            score = float(model.decision_function(transformed)[0])
            probability = float(1 / (1 + np.exp(-score)))
        else:
            probability = float(prediction)
        return prediction, probability

    prediction = int(model.predict(features)[0])
    if hasattr(model, "predict_proba"):
        probability = float(model.predict_proba(features)[0][1])
    elif hasattr(model, "decision_function"):
        score = float(model.decision_function(features)[0])
        probability = float(1 / (1 + np.exp(-score)))
    else:
        probability = float(prediction)
    return prediction, probability


def persist_prediction(payload: PredictionInput, prediction: int, probability: float, risk_score: int) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    status = "blocked" if prediction == 1 else "approved"

    with sqlite3.connect(PREDICTIONS_DB_PATH) as connection:
        cursor = connection.execute(
            """
            INSERT INTO predictions (
                created_at,
                transaction_dt,
                amount,
                product_code,
                card_brand,
                is_fraud,
                fraud_probability,
                risk_score,
                status,
                source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                int(payload.transaction_dt),
                float(payload.amount),
                payload.product_code,
                "User Submission",
                int(prediction),
                float(probability),
                int(risk_score),
                status,
                "sqlite_prediction",
            ),
        )
        connection.commit()
        inserted_id = int(cursor.lastrowid)

    # Refresh the global predictions frame and rebuild combined frame to maintain live updates.
    global global_predictions_frame
    new_row = pd.DataFrame([{
        "TransactionID": f"PRED-{inserted_id:04d}",
        "TransactionDT": int(payload.transaction_dt),
        "TransactionAmt": float(payload.amount),
        "ProductCD": str(payload.product_code),
        "card4": "User Submission",
        "isFraud": int(prediction),
    }])
    if global_predictions_frame is None or global_predictions_frame.empty:
        global_predictions_frame = new_row
    else:
        global_predictions_frame = pd.concat([global_predictions_frame, new_row], ignore_index=True)
    
    build_combined_frame()


    return {
        "id": inserted_id,
        "created_at": created_at,
        "transaction_dt": int(payload.transaction_dt),
        "amount": float(payload.amount),
        "product_code": payload.product_code,
        "card_brand": "User Submission",
        "is_fraud": int(prediction),
        "fraud_probability": float(probability),
        "risk_score": int(risk_score),
        "status": status,
        "source": "sqlite_prediction",
    }


def historical_transaction_record(row: pd.Series) -> dict[str, Any]:
    probability = 0.97 if int(row["isFraud"]) == 1 else 0.08
    risk_score = compute_risk_score(
        amount=float(row["TransactionAmt"]),
        product_code=str(row["ProductCD"]),
        probability=probability,
        is_fraud=int(row["isFraud"]),
    )
    return {
        "id": str(row["TransactionID"]),
        "timestamp": transaction_timestamp(int(row["TransactionDT"])),
        "cardBrand": str(row["card4"]),
        "productCode": str(row["ProductCD"]),
        "amount": float(row["TransactionAmt"]),
        "riskScore": risk_score,
        "status": "blocked" if int(row["isFraud"]) == 1 else "approved",
        "isFraud": int(row["isFraud"]),
        "source": "historical_dataset",
    }


def persisted_transaction_record(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"PRED-{row['id']:04d}",
        "timestamp": row["created_at"],
        "cardBrand": row["card_brand"],
        "productCode": row["product_code"],
        "amount": float(row["amount"]),
        "riskScore": int(row["risk_score"]),
        "status": row["status"],
        "isFraud": int(row["is_fraud"]),
        "source": row["source"],
    }


def alert_record_from_transaction(record: dict[str, Any]) -> dict[str, Any]:
    severity = "critical" if record["riskScore"] >= 90 else "high" if record["riskScore"] >= 70 else "medium"
    return {
        "id": f"ALRT-{record['id']}",
        "transactionId": record["id"],
        "type": "Fraudulent Transaction" if record["isFraud"] == 1 else "High-Risk Review",
        "severity": severity,
        "status": "open",
        "description": (
            f"Transaction using category {PRODUCT_LABEL_MAP.get(record['productCode'], record['productCode'])} "
            f"with amount ${record['amount']:.2f} was scored at risk {record['riskScore']}."
        ),
        "cardBrand": record["cardBrand"],
        "productCode": record["productCode"],
        "amount": record["amount"],
        "riskScore": record["riskScore"],
        "timestamp": record["timestamp"],
        "source": record["source"],
    }


def recent_transaction_records(limit: int = 50) -> list[dict[str, Any]]:
    # Efficient access using the already built global_combined_frame memory pointers.
    if global_combined_frame is None:
        return []
    
    # SQLite predictions must be mapped specifically back to their verbose dict format.
    # But for a fast check, we can derive everything from the combined frame which is ready.
    # Persisted rows IDs must be retrieved correctly for their detailed records.
    records = [persisted_transaction_record(row) for row in fetch_persisted_predictions(limit=limit)]
    if global_historical_frame is not None and not global_historical_frame.empty:
        # Data is pre-sorted at startup, so we just take the head.
        top_rows = global_historical_frame.head(limit)
        records.extend(historical_transaction_record(row) for _, row in top_rows.iterrows())

    records.sort(key=lambda item: item["timestamp"], reverse=True)
    return records[:limit]


def recent_alert_records(limit: int = 20) -> list[dict[str, Any]]:
    # Search through the last 200 transactions regardless of requested limit to maintain count consistency.
    fraud_records = [record for record in recent_transaction_records(limit=200) if record["isFraud"] == 1]
    alerts = [alert_record_from_transaction(record) for record in fraud_records]
    alerts.sort(key=lambda item: item["timestamp"], reverse=True)
    return alerts[:limit]


def dashboard_overview_payload(frame: pd.DataFrame) -> dict[str, Any]:
    if frame.empty:
        return {
            "totalVolume": {"current": 0.0, "unit": "M"},
            "fraudLoss": {"current": 0.0, "unit": "K"},
            "fraudDetected": {"current": 0, "unit": "cases"},
            "fraudRate": {"current": 0.0, "unit": "%"},
            "avgTransaction": {"current": 0.0, "unit": "USD"},
        }

    total_volume = float(frame["TransactionAmt"].sum())
    fraud_amount = float(frame.loc[frame["isFraud"] == 1, "TransactionAmt"].sum())
    fraud_detected = int(frame["isFraud"].sum())
    fraud_rate = overall_fraud_rate(frame) * 100
    avg_transaction = float(frame["TransactionAmt"].mean())

    return {
        "totalVolume": {"current": round(total_volume / 1_000_000, 2), "unit": "M"},
        "fraudLoss": {"current": round(fraud_amount / 1_000, 2), "unit": "K"},
        "fraudDetected": {"current": fraud_detected, "unit": "cases"},
        "fraudRate": {"current": round(fraud_rate, 2), "unit": "%"},
        "avgTransaction": {"current": round(avg_transaction, 2), "unit": "USD"},
    }


def amount_vs_fraud_chart(frame: pd.DataFrame) -> list[dict[str, Any]]:
    if frame.empty:
        return []

    chart_frame = frame.copy()
    chart_frame["FraudAmount"] = np.where(chart_frame["isFraud"] == 1, chart_frame["TransactionAmt"], 0.0)
    chart_frame["bucket"] = pd.cut(chart_frame["TransactionDT"], bins=6, labels=[f"Bucket {idx}" for idx in range(1, 7)])
    grouped = chart_frame.groupby("bucket", observed=False).agg(
        transactionAmount=("TransactionAmt", "sum"),
        fraudAmount=("FraudAmount", "sum"),
    )

    return [
        {
            "bucket": str(row["bucket"]),
            "transactionAmount": round(float(row["transactionAmount"]) / 1_000, 2),
            "fraudAmount": round(float(row["fraudAmount"]) / 1_000, 2),
        }
        for _, row in grouped.reset_index().iterrows()
    ]


def product_breakdown_chart(frame: pd.DataFrame) -> list[dict[str, Any]]:
    if frame.empty:
        return []

    grouped = frame.groupby("ProductCD")["TransactionAmt"].sum().sort_values(ascending=False).head(6)
    return [
        {
            "name": PRODUCT_LABEL_MAP.get(str(name), str(name)),
            "value": round(float(value) / 1_000, 2),
            "fill": PRODUCT_COLORS[index % len(PRODUCT_COLORS)],
        }
        for index, (name, value) in enumerate(grouped.items())
    ]


def hourly_activity_chart(frame: pd.DataFrame) -> list[dict[str, Any]]:
    if frame.empty:
        return []

    chart_frame = frame.copy()
    chart_frame["hour"] = ((chart_frame["TransactionDT"] % 86_400) // 3_600).astype(int)
    grouped = chart_frame.groupby("hour").agg(
        transactions=("TransactionID", "count"),
        fraudCases=("isFraud", "sum"),
    )
    return [
        {
            "hour": f"{int(row['hour']):02d}:00",
            "transactions": int(row["transactions"]),
            "fraudCases": int(row["fraudCases"]),
        }
        for _, row in grouped.reset_index().iterrows()
    ]


def card_brand_breakdown(frame: pd.DataFrame) -> list[dict[str, Any]]:
    if frame.empty:
        return []

    grouped = frame.groupby("card4").agg(
        transactions=("TransactionID", "count"),
        fraudRate=("isFraud", "mean"),
    ).sort_values("transactions", ascending=False).head(5)

    return [
        {
            "name": str(index),
            "transactions": int(row["transactions"]),
            "fraudRate": round(float(row["fraudRate"]) * 100, 2),
        }
        for index, row in grouped.iterrows()
    ]


def dashboard_insights(frame: pd.DataFrame) -> list[dict[str, Any]]:
    if frame.empty:
        return []

    fraud_only = frame[frame["isFraud"] == 1]
    product_rates = frame.groupby("ProductCD")["isFraud"].mean().sort_values(ascending=False)
    riskiest_product = product_rates.index[0]
    riskiest_rate = float(product_rates.iloc[0] * 100)
    riskiest_label = PRODUCT_LABEL_MAP.get(str(riskiest_product), str(riskiest_product))
    avg_fraud_amount = float(fraud_only["TransactionAmt"].mean()) if not fraud_only.empty else 0.0
    avg_all_amount = float(frame["TransactionAmt"].mean())
    recent_persisted_fraud = sum(1 for item in fetch_persisted_predictions(limit=10) if int(item["is_fraud"]) == 1)

    return [
        {
            "id": 1,
            "title": f"Highest fraud rate sits in {riskiest_label}",
            "description": f"Within the loaded IEEE transaction sample, {riskiest_label} has a fraud rate of {riskiest_rate:.2f}%.",
            "severity": "high" if riskiest_rate >= 10 else "medium",
        },
        {
            "id": 2,
            "title": "Fraudulent transactions are materially larger than average",
            "description": f"Average fraudulent amount is ${avg_fraud_amount:.2f} compared with overall average ${avg_all_amount:.2f}.",
            "severity": "critical" if avg_fraud_amount > avg_all_amount * 2 else "medium",
        },
        {
            "id": 3,
            "title": "SQLite-backed predictions survive server restart",
            "description": f"The last 10 persisted predictions contain {recent_persisted_fraud} suspected fraud cases and remain available after restarting the API.",
            "severity": "low" if recent_persisted_fraud == 0 else "medium",
        },
    ]


@app.on_event("startup")
def startup_event() -> None:
    global model_artifacts, model_registry, global_historical_frame, global_predictions_frame

    ensure_storage()
    global_historical_frame = load_historical_transactions().sort_values("TransactionDT", ascending=False)
    global_predictions_frame = persisted_predictions_frame()
    build_combined_frame()

    model_artifacts = {}
    model_registry = {}

    for m_id in PREDICTION_MODEL_ORDER:
        metrics = load_model_metrics(m_id)
        metrics_label = str(metrics.get("name") or model_display_name(m_id))
        metrics_f1 = float(metrics.get("f1_score")) if metrics.get("f1_score") is not None else None
        supports_probability = bool(metrics.get("supports_probability", False))
        a_path = resolve_deployment_artifact(model_id=m_id)
        if a_path is None:
            model_registry[m_id] = {
                "id": m_id,
                "label": metrics_label,
                "status": "missing",
                "available": False,
                "reason": "Artifact file not found.",
                "expected_features": [],
                "f1_score": metrics_f1,
                "supports_probability": supports_probability,
            }
            print(f"Artifact for {m_id} not found.")
            continue

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", InconsistentVersionWarning)
                artifact = joblib.load(a_path)
        except Exception as exc:
            model_registry[m_id] = {
                "id": m_id,
                "label": metrics_label,
                "status": "load_error",
                "available": False,
                "reason": str(exc),
                "expected_features": [],
                "f1_score": metrics_f1,
                "supports_probability": supports_probability,
            }
            print(f"Failed to load artifact: {m_id} -> {a_path.name}: {exc}")
            continue

        compatible, expected_features, reason = validate_artifact_for_prediction(m_id, artifact)
        model_registry[m_id] = {
            "id": m_id,
            "label": str(metrics.get("name") or artifact.get("display_name", model_display_name(m_id))),
            "status": "ready" if compatible else "incompatible",
            "available": compatible,
            "reason": reason,
            "expected_features": expected_features,
            "artifact": a_path.name,
            "f1_score": metrics_f1,
            "supports_probability": supports_probability,
        }
        if compatible:
            model_artifacts[m_id] = artifact
            print(f"Loaded artifact: {m_id} -> {a_path.name}")
        else:
            print(f"Skipped artifact: {m_id} -> {a_path.name} ({reason})")

    persisted_count = len(global_predictions_frame)
    print(f"Loaded historical transactions: {len(global_historical_frame):,} rows")
    print(f"Loaded persisted predictions from SQLite: {persisted_count}")


@app.get("/api/metadata/prediction-options")
def prediction_options() -> dict[str, Any]:
    frame = combined_transactions_frame()
    if frame.empty:
        return {
            "productCodes": [],
            "latestTransactionDt": 0,
            "modelOptions": prediction_model_options(),
            "defaultModelId": default_prediction_model_id(),
        }

    product_codes = sorted(frame["ProductCD"].dropna().astype(str).unique().tolist())
    latest_transaction_dt = int(frame["TransactionDT"].max())
    return {
        "productCodes": product_codes,
        "latestTransactionDt": latest_transaction_dt,
        "modelOptions": prediction_model_options(),
        "defaultModelId": default_prediction_model_id(),
    }


@app.get("/api/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "storage": "sqlite",
        "database_path": str(PREDICTIONS_DB_PATH),
        "database_table": "predictions",
        "persisted_predictions": len(fetch_persisted_predictions()),
        "models_loaded": list(model_artifacts.keys()),
        "models_configured": list(model_registry.keys()),
        "models_available_for_prediction": [item["id"] for item in prediction_model_options()],
        "models_skipped": [
            {
                "id": entry["id"],
                "label": entry["label"],
                "status": entry["status"],
                "reason": entry["reason"],
            }
            for entry in model_registry.values()
            if not entry.get("available", False)
        ],
    }


@app.get("/api/database/summary")
def get_database_summary() -> dict[str, Any]:
    rows = fetch_persisted_predictions(limit=5)
    return {
        "storage": "sqlite",
        "database_path": str(PREDICTIONS_DB_PATH),
        "table": "predictions",
        "persisted_predictions": len(fetch_persisted_predictions()),
        "recent_rows": rows,
    }


@app.get("/api/database/predictions")
def get_database_predictions(limit: int = Query(default=20, ge=1, le=200)) -> list[dict[str, Any]]:
    return fetch_persisted_predictions(limit=limit)


@app.post("/api/predict")
def predict(payload: PredictionInput) -> dict[str, Any]:
    features = pd.DataFrame(
        [
            {
                "TransactionAmt": payload.amount,
                "TransactionDT": payload.transaction_dt,
                "ProductCD": payload.product_code,
            }
        ],
        columns=INFERENCE_FEATURE_COLUMNS,
    )
    # Correctly route prediction to the selected model_id
    prediction, probability = infer_prediction(features, model_id=payload.model_id)
    
    # Calculate risk score using updated memory-cached statistics
    risk_score = compute_risk_score(
        amount=payload.amount,
        product_code=payload.product_code,
        probability=probability,
        is_fraud=prediction,
    )
    
    transaction = persist_prediction(payload, prediction, probability, risk_score)
    artifact = model_artifacts.get(payload.model_id)

    return {
        "is_fraud": int(prediction),
        "fraud_probability": round(float(probability), 6),
        "risk_score": int(risk_score),
        "model_name": artifact.get("display_name", payload.model_id) if artifact else payload.model_id,
        "feature_importance": feature_importance_from_artifact(model_id=payload.model_id),
        "transaction": persisted_transaction_record(transaction),
    }


@app.get("/api/dashboard/bundle")
def get_dashboard_bundle() -> dict[str, Any]:
    frame = combined_transactions_frame()
    return {
        "overview": dashboard_overview_payload(frame),
        "charts": {
            "amountVsFraud": amount_vs_fraud_chart(frame),
            "products": product_breakdown_chart(frame),
            "hourlyActivity": hourly_activity_chart(frame),
            "cardBrands": card_brand_breakdown(frame),
        },
        "insights": dashboard_insights(frame),
    }


@app.get("/api/transactions")
def get_transactions(limit: int = Query(default=50, ge=1, le=200)) -> list[dict[str, Any]]:
    return recent_transaction_records(limit=limit)


@app.get("/api/alerts")
def get_alerts(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
    return recent_alert_records(limit=limit)


@app.get("/api/alerts/{alert_id}")
def get_alert_details(alert_id: str) -> dict[str, Any]:
    alert = next((item for item in recent_alert_records(limit=100) if item["id"] == alert_id), None)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")

    frame = combined_transactions_frame()
    product_rate = product_fraud_rates(frame).get(alert["productCode"], overall_fraud_rate(frame)) * 100
    amount_p95 = float(frame["TransactionAmt"].quantile(0.95)) if not frame.empty else 0.0

    return {
        **alert,
        "supportingFactors": [
            {
                "title": "Product fraud rate",
                "description": f"Category {PRODUCT_LABEL_MAP.get(alert['productCode'], alert['productCode'])} currently shows a fraud rate of {product_rate:.2f}% in the loaded dataset.",
                "severity": "high" if product_rate >= 10 else "medium",
            },
            {
                "title": "Amount threshold check",
                "description": f"The 95th percentile transaction amount is ${amount_p95:.2f}, while this alert amount is ${alert['amount']:.2f}.",
                "severity": "critical" if alert["amount"] >= amount_p95 else "low",
            },
            {
                "title": "Backend source",
                "description": f"This alert was generated from {alert['source'].replace('_', ' ')} and is backed by SQLite persistence.",
                "severity": "low",
            },
        ],
    }


@app.get("/api/model/comparison")
def get_model_comparison() -> list[dict[str, Any]]:
    comparison_path = METRICS_ROOT / "comparison.json"
    if not comparison_path.exists():
        return []
    return json.loads(comparison_path.read_text(encoding="utf-8"))

def _build_system_prompt() -> str:
    """Build a compact system prompt with live SentinelAI data. Cached for 5 min to conserve quota."""
    import time
    now = time.time()
    if _system_prompt_cache["prompt"] and now - _system_prompt_cache["ts"] < _PROMPT_CACHE_SECONDS:
        return _system_prompt_cache["prompt"]

    frame = combined_transactions_frame()
    ov = dashboard_overview_payload(frame)
    preds = fetch_persisted_predictions(limit=3)
    p_rates = product_fraud_rates(frame)
    p95 = cached_risk_stats.get("amount_p95", 0.0)
    models_loaded = ", ".join(model_artifacts.keys()) or "none"

    # Top 3 riskiest products
    top_products = sorted(p_rates.items(), key=lambda x: -x[1])[:3]
    prod_str = " | ".join(
        f"{PRODUCT_LABEL_MAP.get(k, k)}:{v*100:.1f}%" for k, v in top_products
    ) or "N/A"

    # Recent predictions — compact
    pred_str = " | ".join(
        f"PRED-{p['id']:04d} ${p['amount']:.0f} {'FRAUD' if p['is_fraud'] else 'OK'} RS={p['risk_score']}"
        for p in preds
    ) or "none"

    prompt = (
        "You are SentinelAI Assistant, a fraud analytics AI. "
        "Answer in the user's language (Vietnamese or English). Be concise.\n"
        f"DATA: Volume=${ov['totalVolume']['current']}M | Loss=${ov['fraudLoss']['current']}K | "
        f"Cases={ov['fraudDetected']['current']} | Rate={ov['fraudRate']['current']}% | "
        f"AvgTxn=${ov['avgTransaction']['current']} | P95=${p95:.0f}\n"
        f"MODELS: {models_loaded}\n"
        f"TOP PRODUCT FRAUD RATES: {prod_str}\n"
        f"RECENT PREDICTIONS: {pred_str}\n"
        "RISK SCORE=(prob*100)+8 if amt>=P95,+7 if product_rate>1.5x baseline. "
        "Fraud>=70,NonFraud<=49,range 1-99."
    )
    _system_prompt_cache["prompt"] = prompt
    _system_prompt_cache["ts"] = now
    return prompt


def _normalize_chat_history(history: list[ChatMessage]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for message in history:
        text = message.content.strip()
        if not text:
            continue
        normalized.append(
            {
                "role": "user" if message.role == "user" else "model",
                "parts": [{"text": text}],
            }
        )
    return normalized


def _extract_gemini_reply(data: dict[str, Any]) -> str:
    candidates = data.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        text_parts = [
            str(part.get("text", "")).strip()
            for part in parts
            if isinstance(part, dict) and str(part.get("text", "")).strip()
        ]
        if text_parts:
            return "\n".join(text_parts)

        finish_reason = str(candidate.get("finishReason", "")).strip()
        if finish_reason in {"SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"}:
            raise HTTPException(
                status_code=400,
                detail="Gemini blocked the response for safety reasons. Please rephrase your question.",
            )

    prompt_feedback = data.get("promptFeedback") or {}
    block_reason = str(prompt_feedback.get("blockReason", "")).strip()
    if block_reason:
        raise HTTPException(
            status_code=400,
            detail=f"Gemini blocked this prompt ({block_reason}). Please rephrase and try again.",
        )

    raise HTTPException(status_code=502, detail="Gemini returned an empty response.")



# Models ordered from lightest (most likely free) to heaviest.
# These are the actual models available on modern Google AI Studio keys.
_GEMINI_MODEL_CANDIDATES = [
    "gemini-2.0-flash-lite",   # Lightest 2.0 model — best for free tier
    "gemini-2.5-flash-lite",   # Lightest 2.5 model
    "gemini-2.0-flash",        # Standard 2.0
    "gemini-2.5-flash",        # Standard 2.5 (most capable free model)
]

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com"


def _is_api_key_error(http_status: int, message: str) -> bool:
    """Return True only when the error is definitively about an invalid/missing API key."""
    upper = message.upper()
    return (
        "API_KEY_INVALID" in upper
        or "API KEY NOT VALID" in upper
        or ("API_KEY" in upper and "INVALID" in upper)
        or "PERMISSION_DENIED" in upper
        or (http_status == 403 and "API" in upper and "KEY" in upper)
    )


def _extract_retry_after_seconds(response: http_requests.Response) -> int | None:
    """Best-effort parser for Gemini rate-limit cooldown hints."""
    retry_after = response.headers.get("Retry-After", "").strip()
    if retry_after.isdigit():
        return int(retry_after)

    try:
        message = response.json().get("error", {}).get("message", "")
    except Exception:
        message = response.text

    match = re.search(r"try again in\s+([0-9]+(?:\.[0-9]+)?)s", message, re.IGNORECASE)
    if match:
        return max(1, round(float(match.group(1))))

    return None


def _gemini_rest_call(api_key: str, model: str, system_prompt: str, history: list[dict], message: str) -> str:
    """Call Gemini generateContent REST API directly — no SDK dependency."""
    # All versioned models (1.5+, 2.0+, 2.5+, 3.x) support system_instruction.
    # Only the unversioned base 'gemini-pro' does not.
    supports_system_instruction = any(
        v in model for v in ("1.5", "2.0", "2.5", "3.0", "3.1", "flash", "lite")
    )

    for api_version in ("v1beta", "v1"):
        url = f"{GEMINI_BASE_URL}/{api_version}/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }

        if supports_system_instruction:
            contents = list(history) + [{"role": "user", "parts": [{"text": message}]}]
            payload: dict[str, Any] = {
                "system_instruction": {"role": "system", "parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {"maxOutputTokens": 600, "temperature": 0.4},
            }
        else:
            # Inject system context into the first user message for older models
            injected_msg = f"[System context — answer using this data]\n{system_prompt}\n\n[User question]\n{message}"
            contents = list(history) + [{"role": "user", "parts": [{"text": injected_msg}]}]
            payload = {
                "contents": contents,
                "generationConfig": {"maxOutputTokens": 600, "temperature": 0.4},
            }

        try:
            resp = http_requests.post(url, json=payload, headers=headers, timeout=30)
        except http_requests.RequestException as exc:
            raise HTTPException(status_code=503, detail=f"Could not reach Gemini API: {exc}") from exc

        if resp.status_code == 404:
            continue  # Try next api_version, then next model

        if resp.status_code == 429:
            retry_after_seconds = _extract_retry_after_seconds(resp)
            detail = "Rate limit reached. Please wait a moment (free tier)."
            if retry_after_seconds is not None:
                detail = f"Rate limit reached. Retry after about {retry_after_seconds}s (free tier)."
            raise HTTPException(
                status_code=429,
                detail=detail,
            )

        if resp.status_code in (400, 403):
            try:
                err_body = resp.json()
                msg = err_body.get("error", {}).get("message", resp.text)
            except Exception:
                msg = resp.text

            if _is_api_key_error(resp.status_code, msg):
                raise HTTPException(status_code=401, detail=f"Invalid Gemini API key: {msg}")

            # Payload / field incompatibility (e.g., unknown system_instruction) — try next
            continue

        if not resp.ok:
            continue  # Other server errors — try next version

        data = resp.json()
        return _extract_gemini_reply(data)

    raise HTTPException(
        status_code=404,
        detail=f"Model '{model}' not available via v1beta or v1 for this API key.",
    )


@app.get("/api/chat/models")
def list_available_models(x_gemini_key: str | None = Header(default=None)) -> dict[str, Any]:
    """Debug endpoint: lists Gemini models available for the given API key."""
    api_key = x_gemini_key or os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="No API key provided.")

    results = {}
    for version in ("v1beta", "v1"):
        url = f"{GEMINI_BASE_URL}/{version}/models?key={api_key}"
        try:
            resp = http_requests.get(url, timeout=10)
            if resp.ok:
                models = [m["name"] for m in resp.json().get("models", [])]
                results[version] = models
            else:
                results[version] = f"error {resp.status_code}: {resp.text[:200]}"
        except http_requests.RequestException as exc:
            results[version] = f"request error: {exc}"
    return results


@app.post("/api/chat")
def chat(request: ChatRequest, x_gemini_key: str | None = Header(default=None)) -> dict[str, Any]:
    api_key = x_gemini_key or os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="No Gemini API key provided. Enter your key in the chat widget."
        )

    system_prompt = _build_system_prompt()
    history = _normalize_chat_history(request.history)

    last_error: str = ""
    rate_limit_errors: list[str] = []
    auth_error: HTTPException | None = None
    client_error: HTTPException | None = None
    for model in _GEMINI_MODEL_CANDIDATES:
        try:
            reply = _gemini_rest_call(api_key, model, system_prompt, history, request.message)
            return {"reply": reply, "model_used": model}
        except HTTPException as exc:
            if exc.status_code == 401:
                auth_error = exc
                break
            if exc.status_code == 400:
                client_error = exc
                last_error = str(exc.detail)
                continue
            if exc.status_code == 429:
                rate_limit_errors.append(str(exc.detail))
                last_error = str(exc.detail)
                continue
            last_error = exc.detail
            continue  # Try next model on 404 / 500
        except Exception as exc:
            last_error = str(exc)
            continue

    if auth_error is not None:
        raise auth_error

    if client_error is not None and not rate_limit_errors:
        raise client_error

    if rate_limit_errors:
        raise HTTPException(status_code=429, detail=rate_limit_errors[-1])

    raise HTTPException(
        status_code=503,
        detail=(
            f"No Gemini model responded successfully. Last error: {last_error}. "
            "Try calling GET /api/chat/models (with X-Gemini-Key header) to see available models."
        )
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8000"))

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        in_use = sock.connect_ex((host, port)) == 0

    if in_use:
        print(f"Port {port} is already in use. SentinelAI backend may already be running at http://{host}:{port}")
    else:
        uvicorn.run(app, host=host, port=port)
