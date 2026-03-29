import React from 'react';
import InputForm from '../features/prediction/InputForm';
import ResultDisplay from '../features/prediction/ResultDisplay';
import './Predict.css';

const PredictPage: React.FC = () => {
  return (
    <div className="predict-container">
      <div className="predict-header">
        <h1>AI Prediction</h1>
        <p>Analyze a transaction for fraud risk using the AI model.</p>
      </div>

      <div className="predict-grid">
        {/* Left Side: The Input Form */}
        <div className="predict-card">
          <InputForm />
        </div>

        {/* Right Side: The Prediction Results */}
        <div className="predict-card results-section">
          <ResultDisplay />
        </div>
      </div>
    </div>
  );
};

export default PredictPage;