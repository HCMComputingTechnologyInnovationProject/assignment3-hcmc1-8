import pandas as pd
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

# Paths
DATA_PATH = "data/processed/processed_ieee_dataset.csv"
RESULTS_DIR = "results/metrics"
MODELS_DIR = "results/models"

def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"Loading IEEE dataset (Sampling 100k rows for efficiency)...")
    # Reduced columns for speed
    cols = ['isFraud', 'TransactionAmt', 'TransactionDT', 'ProductCD']
    df = pd.read_csv(DATA_PATH, usecols=cols, nrows=100000)
    
    # Simple encoding for ProductCD
    df['ProductCD'] = df['ProductCD'].astype('category').cat.codes
    
    X = df.drop('isFraud', axis=1)
    y = df['isFraud']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    metrics_comparison = []

    # 1. Train Logistic Regression
    print("Training Model 1: Logistic Regression...")
    lr = LogisticRegression(max_iter=1000)
    lr.fit(X_train, y_train)
    preds = lr.predict(X_test)
    prob = lr.predict_proba(X_test)[:, 1] if hasattr(lr, "predict_proba") else [0]*len(preds)
    
    metrics_comparison.append({
        "name": "Logistic Regression",
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, preds, zero_division=0), 4),
        "auc_roc": round(roc_auc_score(y_test, prob), 4)
    })
    joblib.dump(lr, os.path.join(MODELS_DIR, "logistic_regression.pkl"))

    # 2. Train Random Forest
    print("Training Model 2: Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    preds = rf.predict(X_test)
    prob = rf.predict_proba(X_test)[:, 1]
    
    metrics_comparison.append({
        "name": "Random Forest",
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, preds, zero_division=0), 4),
        "auc_roc": round(roc_auc_score(y_test, prob), 4)
    })
    joblib.dump(rf, os.path.join(MODELS_DIR, "random_forest_ieee.pkl"))

    # 3. Train Isolation Forest (Anomaly Detection)
    print("Training Model 3: Isolation Forest...")
    iso = IsolationForest(contamination=0.03, random_state=42)
    iso.fit(X_train)
    # Output is 1 for normal, -1 for anomaly. Convert to 0 (normal), 1 (anomaly)
    preds = iso.predict(X_test)
    preds = [1 if x == -1 else 0 for x in preds]
    
    metrics_comparison.append({
        "name": "Isolation Forest",
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, preds, zero_division=0), 4),
        "auc_roc": "N/A" # Unsupervised doesn't typically have AUC-ROC in this way
    })
    joblib.dump(iso, os.path.join(MODELS_DIR, "isolation_forest_ieee.pkl"))

    # Export Comparison JSON
    OUTPUT_FILE = os.path.join(RESULTS_DIR, "comparison.json")
    with open(OUTPUT_FILE, "w") as f:
        json.dump(metrics_comparison, f, indent=4)
    
    print(f"Master training complete! Results saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
