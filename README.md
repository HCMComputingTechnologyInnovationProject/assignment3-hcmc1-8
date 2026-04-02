# SentinelAI: Full-Stack Fraud Detection System

A unified project for machine learning modeling and its corresponding real-time dashboard.

## Team Members

| Name                  | Student ID | Task & Responsibility                                                                          |
| :-------------------- | :--------- | :--------------------------------------------------------------------------------------------- |
| Bui Quang Doan        | 104993227  | Data Processing & Dataset Preparation for 2006, Frontend Support                               |
| Do Gia Huy (Leader)   | 104988294  | ML Implementation (LSTM/GRU), Model Evaluation, Data Processing & Dataset Preparation for 2014 |
| Huynh Doan Hoang Minh | 104777308  | ML Implementation (LightGBM), Model Evaluation, Backend, Frontend Supporter                    |
| Le Thanh Nam          | 104999380  | System Integration, Travel Time Estimation & GUI                                               |

## 📂 Project Structure

```text
/root
├── frontend/             <-- React + Vite + Tailwind GUI
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/              <-- FastAPI + Scikit-Learn Server
│   ├── data/
│   ├── results/
│   └── api_server.py
├── package.json          <-- Root management scripts
└── .gitignore
```

## 🚀 Getting Started

From the root directory, you can run:

### 1. Start Frontend
```bash
npm run dev
```

### 2. Start Backend
```bash
npm run backend
```

### 3. Install All Dependencies
```bash
npm run install-all
```

## 🛠️ Requirements
- Node.js & npm (for Frontend)
- Python 3.8+ (for Backend)
- Python libraries: `pandas`, `numpy`, `scikit-learn`, `fastapi`, `uvicorn`, `joblib`, `pydantic`
