# SentinelAI: Full-Stack Fraud Detection System

A unified project for machine learning modeling and its corresponding real-time dashboard.

## Team Members

| Name                  | Student ID | Task & Responsibility                                                                          |
| :-------------------- | :--------- | :--------------------------------------------------------------------------------------------- |
| Huynh Ba Thanh        | 105029615  | Data Processing & Dataset Preparation for IEEE, PaySim, and ULB, Frontend Support              |
| Le Thanh Nam (Leader) | 104999380  | ML Implementation (Logistics Regression/GRU), Model Evaluation, Backend, AI Integration        |
| Nguyen Hai Dang       | 105680423  | Model Evaluation Metrics, Frontend Support                                                     |
| Ho Cao Cuong          | 105687343  | ML Implementation (Isolation Forest), Backend Support                                          |

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
