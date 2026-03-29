import React, { useState } from 'react';
import { BrainCircuit } from 'lucide-react';

const InputForm: React.FC = () => {
    const [amount, setAmount] = useState('');

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Analyzing...", amount);
        // Soon, we will add the logic here to save to Transactions!
    };

    return (
        <form className="prediction-form" onSubmit={handleAnalyze}>
            <div className="form-title">
                <BrainCircuit size={20} className="accent-blue" />
                <h2>Transaction Input</h2>
            </div>
            <p className="form-subtitle">Enter transaction details for analysis.</p>

            <div className="form-group">
                <label>Transaction Amount ($)</label>
                <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label>Transaction Type</label>
                <select>
                    <option value="">Select type</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="card">Card Payment</option>
                    <option value="crypto">Crypto Exchange</option>
                </select>
            </div>

            <div className="form-group">
                <label>Location / Region</label>
                <select>
                    <option value="">Select region</option>
                    <option value="na">North America</option>
                    <option value="eu">Europe</option>
                    <option value="asia">Southeast Asia</option>
                </select>
            </div>

            <button type="submit" className="analyze-btn">
                <BrainCircuit size={18} />
                Analyze Transaction
            </button>
        </form>
    );
};

export default InputForm;