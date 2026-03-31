# SentinelAI: Full-Stack Fraud Detection System

A unified project for machine learning modeling and its corresponding real-time dashboard.

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
