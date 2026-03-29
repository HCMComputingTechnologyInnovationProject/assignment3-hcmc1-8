import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/Dashboard';
import PredictPage from './pages/Predict';
// Import other pages as you create them
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />

        <div className="main-layout">
          <Navbar />

          <main className="content-area">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/predict" element={<PredictPage />} />

            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;