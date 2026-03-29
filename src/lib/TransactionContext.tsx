import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1. Define what a Transaction looks like (TypeScript Interface)
export interface Transaction {
    id: string;
    timestamp: string;
    merchant: string;
    type: string;
    region: string;
    amount: number;
    risk: number;
    status: 'approved' | 'flagged' | 'blocked';
}

interface TransactionContextType {
    transactions: Transaction[];
    addTransaction: (data: Partial<Transaction>) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
    // Initial Mock Data to make the dashboard look "alive"
    const [transactions, setTransactions] = useState<Transaction[]>([
        {
            id: 'TX-001',
            timestamp: new Date().toLocaleString(),
            merchant: 'Apex Electronics Ltd',
            type: 'Wire Transfer',
            region: 'Eastern Europe',
            amount: 12450,
            risk: 94,
            status: 'flagged'
        }
    ]);

    const addTransaction = (newData: Partial<Transaction>) => {
        // Generate AI-like results automatically
        const riskScore = Math.floor(Math.random() * 100);
        let status: 'approved' | 'flagged' | 'blocked' = 'approved';

        if (riskScore > 80) status = 'blocked';
        else if (riskScore > 60) status = 'flagged';

        const fullRecord: Transaction = {
            id: `TX-00${transactions.length + 1}`,
            timestamp: new Date().toLocaleString(),
            merchant: newData.merchant || 'Unknown Merchant',
            type: newData.type || 'Card Payment',
            region: newData.region || 'North America',
            amount: newData.amount || 0,
            risk: riskScore,
            status: status,
        };

        // Add to the TOP of the list so it shows up first in the table
        setTransactions((prev) => [fullRecord, ...prev]);
    };

    return (
        <TransactionContext.Provider value={{ transactions, addTransaction }}>
            {children}
        </TransactionContext.Provider>
    );
};

// Custom Hook for easy access
export const useTransactions = () => {
    const context = useContext(TransactionContext);
    if (!context) throw new Error('useTransactions must be used within a TransactionProvider');
    return context;
};