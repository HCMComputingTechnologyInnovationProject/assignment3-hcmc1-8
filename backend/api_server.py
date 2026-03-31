from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import json
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="SentinelAI API", description="Real-time Fraud Detection")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
MODEL_PATH = "results/models/random_forest_ieee.pkl" # Using the best model we trained
STATS_PATH = "results/dashboard_stats.json"
DATASET_PATH = "data/processed/processed_ieee_dataset.csv"

model = None
dashboard_data = None
session_fraud_count = 0

@app.get("/api/alerts")
def get_alerts():
    try:
        # Load real fraud cases from dataset to show as alerts
        df = pd.read_csv(DATASET_PATH, nrows=500)
        frauds = df[df['isFraud'] == 1].head(10)
        
        alerts = []
        for i, row in frauds.iterrows():
            alerts.append({
                "id": f"ALRT-{int(row['TransactionID'])}",
                "type": "High Risk Transaction",
                "severity": "critical",
                "status": "open",
                "description": f"Suspicious activity detected on card ending in {int(str(row['card1'])[-4:])}",
                "merchant": f"Product Category: {row['ProductCD']}",
                "amount": float(row['TransactionAmt']),
                "riskScore": 95,
                "timestamp": "2024-03-31T10:00:00Z"
            })
        return alerts
    except Exception as e:
        print(f"Alert error: {e}")
        return []

@app.on_event("startup")
def startup_event():
    global model, dashboard_data
    # 1. Load the Best Model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Loaded {MODEL_PATH}")
    
    # 2. Load Stats
    if os.path.exists(STATS_PATH):
        with open(STATS_PATH, 'r') as f:
            dashboard_data = json.load(f)
        print(f"✅ Loaded statistics from {STATS_PATH}")

# Pydantic Schemas
class PredictionInput(BaseModel):
    amount: float
    type: str = "W" # Default category
    # Include other features if necessary for your actual model input
    # For now, we simulate with amount + random noise for demonstration
    pass

@app.post("/api/predict")
def predict(data: dict):
    global session_fraud_count
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train first.")
    
    # Pre-processing (must match training)
    # The IEEE RF model expects: ['TransactionAmt', 'TransactionDT', 'ProductCD']
    # We mock missing features (time) as 0 for this instant prediction test
    amt = float(data.get("amount", 100))
    # ProductCD mapping (W=4, C=0, H=1, R=2, S=3)
    pcd_map = {"Web": 4, "Card": 0, "High-risk": 1, "Retail": 2}
    pcd = pcd_map.get(data.get("type"), 4)
    
    input_features = pd.DataFrame([[amt, 0, pcd]], columns=['TransactionAmt', 'TransactionDT', 'ProductCD'])
    
    # AI Prediction
    res = int(model.predict(input_features)[0])
    prob = float(model.predict_proba(input_features)[0][1])

    if res == 1:
        session_fraud_count += 1
        print(f"🚩 Fraud Blocked! Total Detection: {session_fraud_count}")

    return {"is_fraud": res, "fraud_probability": prob}

@app.get("/api/dashboard/overview")
def get_overview():
    if not dashboard_data:
        raise HTTPException(status_code=404, detail="Stats file missing. Run generate_real_stats.py first.")
    
    live_data = dashboard_data["overview"].copy()
    live_data["fraud_detected"]["current"] += session_fraud_count
    return live_data

@app.get("/api/dashboard/charts/revenue-expense")
def get_chart_re():
    if not dashboard_data: return {"labels": [], "revenue": [], "expenses": []}
    return dashboard_data["charts"]["revenue_expense"]

@app.get("/api/dashboard/charts/projects")
def get_chart_projs():
    if not dashboard_data: return []
    return dashboard_data["charts"]["projects"]

@app.get("/api/transactions")
def get_tx_logs():
    if os.path.exists(DATASET_PATH):
        df = pd.read_csv(DATASET_PATH, nrows=50)
        return df.fillna(0).to_dict(orient="records")
    return []

@app.get("/api/model/comparison")
def get_eval():
    path = "results/metrics/comparison.json"
    if os.path.exists(path):
        with open(path, 'r') as f: return json.load(f)
    return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
