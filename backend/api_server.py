from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import json
from fastapi.staticfiles import StaticFiles


app = FastAPI(title="SentinelAI API", description="API server for the SentinelAI Dashboard and Model Prediction", version="1.0.0")

# Setup CORS to allow the frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production (e.g., ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the results figures directory so the GUI can access images
app.mount("/results/figures", StaticFiles(directory="results/figures"), name="figures")


# ---------------------------------------------------------
# Load Machine Learning Model
# ---------------------------------------------------------
MODEL_PATH = "results/models/model1_logistic_regression.pkl"
SCALER_PATH = "results/models/model1_scaler.pkl"

model = None
scaler = None

@app.on_event("startup")
def load_ml_assets():
    global model, scaler
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            print(f"Loaded model from {MODEL_PATH}")
        else:
            print(f"Warning: Model not found at {MODEL_PATH}")
            
        if os.path.exists(SCALER_PATH):
            scaler = joblib.load(SCALER_PATH)
            print(f"Loaded scaler from {SCALER_PATH}")
        else:
            print(f"Warning: Scaler not found at {SCALER_PATH}")
    except Exception as e:
        print(f"Error loading ML assets: {e}")

# ---------------------------------------------------------
# Pydantic Schemas for Prediction
# ---------------------------------------------------------
class TransactionInput(BaseModel):
    time: float
    v1: float
    v2: float
    v3: float
    v4: float
    v5: float
    v6: float
    v7: float
    v8: float
    v9: float
    v10: float
    v11: float
    v12: float
    v13: float
    v14: float
    v15: float
    v16: float
    v17: float
    v18: float
    v19: float
    v20: float
    v21: float
    v22: float
    v23: float
    v24: float
    v25: float
    v26: float
    v27: float
    v28: float
    amount: float

class PredictionResponse(BaseModel):
    is_fraud: int
    fraud_probability: float

# ---------------------------------------------------------
# Endpoints: Prediction
# ---------------------------------------------------------
@app.post("/api/predict", response_model=PredictionResponse)
def predict_transaction(transaction: TransactionInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Machine learning model is not loaded.")
        
    # Convert input to DataFrame (keeps ordering)
    input_data = pd.DataFrame([transaction.dict()])
    
    # Simple check - if we have the scaler, we might need to scale the amount/time.
    # In data_engineer_pipeline.py, RobustScaler was applied to numeric_cols.
    # We will assume scaler applies to all 30 features as per the training pipeline.
    features = input_data.values
    if scaler is not None:
        try:
            features = scaler.transform(features)
        except Exception as e:
            # If scaling fails due to shape mismatched, we'll try without scaling
            print(f"Scaling failed: {e}. Moving on without scaling.")
    
    # Predict
    try:
        prediction = model.predict(features)
        prediction_prob = model.predict_proba(features)
        
        # prediction_prob returns [[prob_0, prob_1]]
        fraud_prob = float(prediction_prob[0][1]) if len(prediction_prob[0]) > 1 else float(prediction[0])
        
        return PredictionResponse(
            is_fraud=int(prediction[0]),
            fraud_probability=fraud_prob
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# ---------------------------------------------------------
# Endpoints: SentinelAI GUI / Dashboard Stats
# ---------------------------------------------------------

@app.get("/api/dashboard/overview")
def get_dashboard_overview():
    return {
        "revenue": {"current": 2.32, "unit": "M", "previous": 1.87, "trend": "up"},
        "expense": {"current": 42.76, "unit": "K", "previous": 48.96, "trend": "down"},
        "profit": {"current": 516.76, "unit": "K", "previous": 471.63, "trend": "up"},
        "revenue_per_employee": {"current": 110.01, "unit": "K"},
        "active_customers": {"current": 3.63, "unit": "K"}
    }

@app.get("/api/dashboard/charts/revenue-expense")
def get_revenue_expense_chart():
    # Mocked data matching the chart in the image
    return {
        "labels": ["Oct 2019", "Nov 2019", "Dec 2019", "Jan 2020", "Feb 2020", "Mar 2020"],
        "revenue": [30000, 75000, 60000, 58000, 58000, 35000],
        "expenses": [15000, 20000, 10000, 10000, 10000, 5000]
    }

@app.get("/api/dashboard/charts/projects")
def get_projects_chart():
    return [
        {"name": "OEM Mobile Apps", "value": 60, "percentage": 6.0},
        {"name": "ERP", "value": 300, "percentage": 30.0},
        {"name": "Consulting Services", "value": 250, "percentage": 25.0},
        {"name": "Certification Program", "value": 200, "percentage": 20.0},
        {"name": "App Builder", "value": 190, "percentage": 19.0}
    ]

@app.get("/api/dashboard/map")
def get_global_customer_reach():
    return [
        {"id": 1, "country": "USA", "lat": 37.0902, "lng": -95.7129, "value": 100},
        {"id": 2, "country": "Brazil", "lat": -14.2350, "lng": -51.9253, "value": 45},
        {"id": 3, "country": "UK", "lat": 55.3781, "lng": -3.4360, "value": 80},
        {"id": 4, "country": "India", "lat": 20.5937, "lng": 78.9629, "value": 60},
        {"id": 5, "country": "Japan", "lat": 36.2048, "lng": 138.2529, "value": 50},
        {"id": 6, "country": "Australia", "lat": -25.2744, "lng": 133.7751, "value": 30}
    ]

@app.get("/api/dashboard/velocity")
def get_system_velocity():
    # A simple curve representing the velocity line chart
    return {
        "labels": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
        "values": [50, 60, 150, 450, 600, 400, 100]
    }

@app.get("/api/alerts")
def get_alerts():
    return [
        {
            "id": 1,
            "title": "Velocity Anomaly Detected",
            "description": "Transaction velocity in the 12:00-14:00 window is 3.2x above baseline. 15 anomalous transactions identified with geographic clustering in Eastern Europe.",
            "severity": "high",
            "timestamp": "10 min ago"
        },
        {
            "id": 2,
            "title": "New Shell Company Pattern",
            "description": "ML model identified 3 new entities matching shell company behavioral patterns.",
            "severity": "medium",
            "timestamp": "45 min ago"
        }
    ]

# ---------------------------------------------------------
# Endpoints: Model Evaluation Metrics & Figures
# ---------------------------------------------------------

@app.get("/api/model/metrics")
def get_model_metrics(model_name: str = "model1_logistic_regression"):
    metrics_path = f"results/metrics/{model_name}_metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Metrics not found")

@app.get("/api/model/figures")
def get_model_figures(model_name: str = "model1_logistic_regression"):
    # We serve the path so the GUI can display the image from the mounted static route
    figure_filename = f"{model_name}_cm.png"
    figure_path = f"results/figures/{figure_filename}"
    if os.path.exists(figure_path):
        return {"confusion_matrix_url": f"/results/figures/{figure_filename}"}
    raise HTTPException(status_code=404, detail="Figure not found")


if __name__ == "__main__":
    import uvicorn
    # Make sure to run the server on port 8000 or your preferred port!
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
