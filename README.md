# SentinelAI

SentinelAI is a full-stack fraud detection project built with React, FastAPI, scikit-learn, XGBoost, and SQLite. The application lets users submit transaction features, run real model inference, persist the prediction to a local database, and review the results through charts, alerts, and transaction history.

## Team Members

| Name                  | Student ID | Task & Responsibility                                                                          |
| :-------------------- | :--------- | :--------------------------------------------------------------------------------------------- |
| Huynh Ba Thanh        | 105029615  | Data Processing & Dataset Preparation for IEEE, PaySim, and ULB, Frontend Support              |
| Le Thanh Nam (Leader) | 104999380  | ML Implementation (Logistics Regression/GRU), Model Evaluation, Backend, AI Integration        |
| Nguyen Hai Dang       | 105680423  | Model Evaluation Metrics, Frontend Support                                                     |
| Ho Cao Cuong          | 105687343  | ML Implementation (Isolation Forest/XG Boost), Backend Support                                 |

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Chart.js
- Backend: FastAPI, Pydantic
- ML: scikit-learn, XGBoost, joblib
- Data: IEEE-CIS, PaySim, ULB (see Dataset section below)
- Persistence: SQLite

## Dataset

This project uses multiple fraud detection datasets:

### IEEE-CIS Fraud Detection
- Published: 2019  
- Rows: 590,540 | Columns: 434  
- Source: IEEE (Kaggle)  
- Description: Real-world e-commerce transactions for fraud detection.

---

### PaySim Mobile Money Transactions
- Published: 2016  
- Rows: 6,362,620 | Columns: 11  
- Author: Lopez-Rojas et al.  
- Description: Simulated mobile payment transactions.

---

### ULB Credit Card Fraud Dataset
- Published: 2013  
- Rows: 284,807 | Columns: 31  
- Source: ULB  
- Description: Real credit card transactions with anonymized features.

---

Due to large file sizes, all datasets are hosted on Google Drive.

- Download All Datasets: [Google Drive Link](https://drive.google.com/file/d/15am_9a7qWk6tBoXA92ZEmKxgJmcmhBvn/view?usp=drive_link)

---

### Setup

1. Download the dataset folder from the link above  
2. Extract the files (if zipped)  

3. Place raw datasets into:
`backend/data/raw/`

4. Place the processed dataset folder into:
`backend/data/`

Final structure should look like:

backend/data/
├── raw/
├── processed/

---

### Notes

- Ensure raw datasets are placed inside `backend/data/raw/`
- Ensure processed datasets are placed inside `backend/data/processed/`
- Do not rename files or folders, as training scripts depend on exact structure
- The project processes and combines these datasets during training

## Project Structure

```text
final-project/
|- frontend/
|  |- src/
|  |- package.json
|- backend/
|  |- api_server.py
|  |- requirements.txt
|  |- code/training/
|  |- data/raw/
|  |- data/predictions.db
|  |- results/models/
|  |- results/metrics/
|- run_dev.py
|- package.json
|- README.md
```

## Features

- Prediction form with validation for `TransactionAmt`, `ProductCD`, and `TransactionDT`
- Real backend inference using the exported deployment model
- SQLite persistence for user-submitted predictions
- Transactions page backed by historical IEEE data plus persisted predictions
- Alerts page generated from high-risk and fraudulent transactions
- Dashboard charts using Chart.js
- Model Evaluation page comparing Precision, Recall, and F1-score on one shared stratified test split

## Models

The training pipeline currently evaluates four models on the same train/test split:

1. Logistic Regression
2. Isolation Forest
3. Random Forest
4. XGBoost

The exported deployment model is selected from the probability-supporting models using the best F1-score on the shared test split.

### Latest Sample Metrics

These were produced with:

```bash
python backend/code/training/train_and_export.py --rows 20000
```

| Model | Precision | Recall | F1-score |
| --- | --- | --- | --- |
| Logistic Regression | 0.0699 | 0.4375 | 0.1205 |
| Isolation Forest | 0.0248 | 0.0268 | 0.0258 |
| Random Forest | 0.2245 | 0.3929 | 0.2857 |
| XGBoost | 0.5455 | 0.0536 | 0.0976 |

Current deployment recommendation: `Random Forest`

## Data Flow

### Prediction Flow

1. The user enters `Transaction Amount`, `ProductCD`, and `TransactionDT`.
2. The frontend sends the data to `POST /api/predict`.
3. The backend loads the trained artifact from `backend/results/models/`.
4. The deployed model predicts fraud probability and label.
5. The backend computes a project-level risk score.
6. The prediction is written into SQLite at `backend/data/predictions.db`.
7. Dashboard, Transactions, and Alerts read those persisted rows and reflect them after refresh or polling.

### Why Predictions Survive Restart

Predictions are no longer stored only in memory. They are inserted into the SQLite table `predictions`, so after the backend restarts, the rows are loaded again from disk.

## Understanding the Input Fields

### `TransactionAmt`

This is the transaction amount in the IEEE dataset and is treated as a numeric feature.

### `ProductCD`

`ProductCD` is a categorical product code from the IEEE-CIS fraud dataset. In this project it acts as a transaction category feature. The observed values usually include codes such as:

- `C`
- `H`
- `R`
- `S`
- `W`

The exact business meaning is abstracted by the dataset, but the model still learns fraud patterns from these categories.

### `TransactionDT`

`TransactionDT` is the time offset in seconds from the dataset reference start. It is not a human-readable timestamp typed by users. It is a numeric value used by the original dataset and by the model training pipeline.

## What the Prediction Screen Shows

When you submit a prediction:

- `Prediction`: the final class label, Fraud or Not Fraud
- `Confidence`: the model's confidence in the predicted class
- `Risk Score`: an application-level score from 1 to 99
- `Feature Importance`: how strongly the current deployed model weighs each input feature
- `Probability`: fraud vs normal probability split
- `Recorded Prediction`: the database-backed record created by the API

## Setup

### Prerequisites

- Python 3.10+ recommended
- Node.js 18+ recommended
- npm

### Install Dependencies

From the project root:

```bash
npm run install-all
```

This installs:

- frontend dependencies from `frontend/package.json`
- backend Python packages from `backend/requirements.txt`

## Running the App

### Start Frontend and Backend Together

From the root folder:

```bash
npm run dev
```

This starts:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:5173`

### Run Backend Only

```bash
npm run dev:backend
```

### Run Frontend Only

```bash
npm run dev:frontend
```

## Training Models

### Train on a Sample

```bash
npm run train
```

Equivalent command:

```bash
python backend/code/training/train_and_export.py --rows 20000
```

### Train on the Full Dataset

```bash
python backend/code/training/train_and_export.py --rows 0
```

### Train One Model Only

```bash
python backend/code/training/train_model1.py --rows 20000
python backend/code/training/train_model2.py --rows 20000
python backend/code/training/train_model3.py --rows 20000
python backend/code/training/train_model4.py --rows 20000
```

### Training Outputs

Artifacts are saved in:

- Models: `backend/results/models/`
- Metrics: `backend/results/metrics/`

Important metric files:

- `dataset_split_summary.json`
- `comparison.json`
- `deployment_target.json`
- `model1_logistic_regression_metrics.json`
- `model2_isolation_forest_metrics.json`
- `model3_random_forest_metrics.json`
- `model4_xgboost_metrics.json`

## SQLite Database

### Database Location

The SQLite file is stored at:

```text
backend/data/predictions.db
```

### Table Used

The backend writes to:

```text
predictions
```

### How to Inspect the Database

#### Option 1: Root helper command

From the root folder:

```bash
npm run db:show
```

This prints:

- database path
- table name
- total persisted rows
- column list
- recent prediction rows

#### Option 2: API endpoints

Open these in the browser or Postman:

- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8000/api/database/summary`
- `http://127.0.0.1:8000/api/database/predictions?limit=20`

#### Option 3: SQLite viewer

You can open `backend/data/predictions.db` using:

- DB Browser for SQLite
- VS Code SQLite extension

## API Reference

### Health and Metadata

- `GET /api/health`
- `GET /api/metadata/prediction-options`
- `GET /api/database/summary`
- `GET /api/database/predictions`

### Prediction

- `POST /api/predict`

Example body:

```json
{
  "amount": 2500,
  "transaction_dt": 900000,
  "product_code": "W"
}
```

### Dashboard

- `GET /api/dashboard/overview`
- `GET /api/dashboard/charts/amount-vs-fraud`
- `GET /api/dashboard/charts/products`
- `GET /api/dashboard/charts/hourly-activity`
- `GET /api/dashboard/charts/card-brands`
- `GET /api/dashboard/insights`

### Transactions and Alerts

- `GET /api/transactions`
- `GET /api/alerts`
- `GET /api/alerts/{alert_id}`

### Model Evaluation

- `GET /api/model/comparison`

## Testing Prediction

1. Start the app with `npm run dev`
2. Open `http://127.0.0.1:5173/prediction`
3. Enter a sample transaction
4. Submit the form
5. Confirm the result appears
6. Open `Transactions` and verify the record exists
7. Stop the backend
8. Start the app again
9. Check `Transactions` again and confirm the record is still present

## Charts Used for Requirement Coverage

The project now uses Chart.js chart types including:

- Bar chart
- Doughnut chart
- Line chart

These are used across the Dashboard and Model Evaluation pages to satisfy the visualization requirement.

## Requirement Coverage Check

### 1. Front-End Development

- Input form with validation: complete
- At least two chart types using D3.js, Chart.js, or Plotly.js: complete
- User-friendly responsive interface: complete
- Backend API integration for submission and retrieval: complete
- UI/UX improvements: mostly complete

### 2. Back-End Development

- FastAPI server with necessary routes: complete
- At least two HTTP methods: complete with `GET` and `POST`
- AI model integration from Assignment 2 flow: complete
- Endpoints for user data and predictions: complete
- Error handling and stable operation: mostly complete

### 3. AI Model Integration

- Model execution on server: complete
- Preprocessing and postprocessing logic: complete
- Shared evaluation split for model comparison: complete

### 4. Documentation

- Detailed README for setup and running: complete with this file
- Implementation explanation for architecture, preprocessing, postprocessing, API use, and evaluation: complete in this README

## Recommended Next Improvements

These are the best next steps if the team wants a stronger final submission or HD-level polish:

1. Add export to CSV for predictions and alerts
2. Add filters on Dashboard, Transactions, and Alerts
3. Add PUT or DELETE endpoints for managing persisted predictions
4. Add stronger backend exception logging around SQLite and model loading
5. Add frontend empty-state and retry components for every API-driven page
6. Add a separate Prediction History page backed directly by SQLite

## Troubleshooting

### Backend says port 8000 is already in use

Another backend is already running. Stop that process first, or keep using the running instance.

### Prediction page cannot call the API

Check:

1. `npm run dev` is running
2. `http://127.0.0.1:8000/api/health` returns status `ok`
3. a trained model exists in `backend/results/models/`

### Transactions do not show old predictions

Run:

```bash
npm run db:show
```

If the database contains rows, the backend should reload them automatically on startup.

### Model Evaluation does not show XGBoost

Retrain from the root:

```bash
python backend/code/training/train_and_export.py --rows 20000
```

Then refresh the page.

## Useful Commands

```bash
npm run install-all
npm run dev
npm run dev:backend
npm run dev:frontend
npm run train
npm run db:show
python backend/code/training/train_and_export.py --rows 0
```
