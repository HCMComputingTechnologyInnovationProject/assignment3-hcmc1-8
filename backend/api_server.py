from __future__ import annotations

import json
import os
import socket
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


APP_ROOT = Path(__file__).resolve().parent
RESULTS_ROOT = APP_ROOT / "results"
MODELS_ROOT = RESULTS_ROOT / "models"
METRICS_ROOT = RESULTS_ROOT / "metrics"
DATASET_PATH = APP_ROOT / "data" / "raw" / "train_transaction.csv"
PREDICTIONS_DB_PATH = APP_ROOT / "data" / "predictions.db"
DATASET_EPOCH = datetime(2017, 12, 1, tzinfo=timezone.utc)
DATASET_SAMPLE_ROWS = 150_000
PRODUCT_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"]

DATASET_COLUMNS = [
    "TransactionID",
    "TransactionDT",
    "TransactionAmt",
    "ProductCD",
    "card4",
    "isFraud",
]

app = FastAPI(title="SentinelAI API", description="Real fraud analytics and model inference API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_artifacts: dict[str, Any] = {}
global_historical_frame: pd.DataFrame | None = None
global_predictions_frame: pd.DataFrame | None = None
global_combined_frame: pd.DataFrame | None = None
cached_risk_stats: dict[str, Any] = {}


def build_combined_frame() -> None:
    global global_combined_frame
    if global_historical_frame is None:
        return

    if global_predictions_frame is None or global_predictions_frame.empty:
        global_combined_frame = global_historical_frame.copy()
    else:
        global_combined_frame = pd.concat([global_historical_frame, global_predictions_frame], ignore_index=True)

    refresh_risk_stats(global_combined_frame)


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
    model_files = {
        "xgboost": "model4_xgboost.pkl",
        "random_forest": "model3_random_forest.pkl",
        "logistic_regression": "model1_logistic_regression.pkl",
        "isolation_forest": "model2_isolation_forest.pkl",
    }
    candidate = MODELS_ROOT / model_files.get(model_id, "")
    return candidate if candidate.exists() else None


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


def feature_importance_from_artifact() -> list[dict[str, float]]:
    if model_artifacts is None:
        return []
    raw_importance = model_artifacts.get("feature_importance", [])
    return [{"name": str(item["name"]), "value": float(item["value"])} for item in raw_importance]


def infer_prediction(features: pd.DataFrame, model_id: str = "xgboost") -> tuple[int, float]:
    artifact = model_artifacts.get(model_id)
    if artifact is None:
        raise HTTPException(status_code=503, detail=f"Model artifact '{model_id}' not loaded.")

    model = artifact["model"]
    if "preprocessor" in artifact:
        transformed = artifact["preprocessor"].transform(features)
        raw_prediction = int(model.predict(transformed)[0])
        prediction = 1 if raw_prediction == -1 else 0
        score = float((-model.score_samples(transformed))[0])
        probability = float(max(0.0, min(1.0, score / (score + 1))))
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
            f"Transaction using ProductCD {record['productCode']} with amount ${record['amount']:.2f} "
            f"was scored at risk {record['riskScore']}."
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
            "name": str(name),
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
    avg_fraud_amount = float(fraud_only["TransactionAmt"].mean()) if not fraud_only.empty else 0.0
    avg_all_amount = float(frame["TransactionAmt"].mean())
    recent_persisted_fraud = sum(1 for item in fetch_persisted_predictions(limit=10) if int(item["is_fraud"]) == 1)

    return [
        {
            "id": 1,
            "title": f"Highest fraud rate sits in ProductCD {riskiest_product}",
            "description": f"Within the loaded IEEE transaction sample, ProductCD {riskiest_product} has a fraud rate of {riskiest_rate:.2f}%.",
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
    global model_artifacts, global_historical_frame, global_predictions_frame

    ensure_storage()
    global_historical_frame = load_historical_transactions().sort_values("TransactionDT", ascending=False)
    global_predictions_frame = persisted_predictions_frame()
    build_combined_frame()

    for m_id in ["xgboost", "random_forest", "logistic_regression", "isolation_forest"]:
        a_path = resolve_deployment_artifact(model_id=m_id)
        if a_path is not None:
            model_artifacts[m_id] = joblib.load(a_path)
            print(f"Loaded artifact: {m_id} -> {a_path.name}")
        else:
            print(f"Artifact for {m_id} not found.")

    persisted_count = len(global_predictions_frame)
    print(f"Loaded historical transactions: {len(global_historical_frame):,} rows")
    print(f"Loaded persisted predictions from SQLite: {persisted_count}")


@app.get("/api/metadata/prediction-options")
def prediction_options() -> dict[str, Any]:
    frame = combined_transactions_frame()
    if frame.empty:
        return {"productCodes": [], "latestTransactionDt": 0}

    product_codes = sorted(frame["ProductCD"].dropna().astype(str).unique().tolist())
    latest_transaction_dt = int(frame["TransactionDT"].max())
    return {
        "productCodes": product_codes,
        "latestTransactionDt": latest_transaction_dt,
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
        ]
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
        "feature_importance": feature_importance_from_artifact() if payload.model_id == "xgboost" else [],
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
                "description": f"ProductCD {alert['productCode']} currently shows a fraud rate of {product_rate:.2f}% in the loaded dataset.",
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
