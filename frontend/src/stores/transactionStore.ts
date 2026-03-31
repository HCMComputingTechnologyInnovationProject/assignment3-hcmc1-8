import { Transaction, transactions as mockTransactions } from "@/data/mockData";

let listeners: (() => void)[] = [];
let storedTransactions: Transaction[] = [...mockTransactions];
let nextId = mockTransactions.length + 1;

function notify() {
  listeners.forEach((l) => l());
}

export function getTransactions(): Transaction[] {
  return storedTransactions;
}

export function addTransaction(tx: Omit<Transaction, "id" | "timestamp" | "currency" | "cardLast4" | "ip" | "country"> & { riskScore: number; status: "approved" | "flagged" | "blocked" }) {
  const id = `TXN-${String(nextId++).padStart(3, "0")}`;
  const newTx: Transaction = {
    id,
    timestamp: new Date().toISOString(),
    amount: tx.amount,
    currency: "USD",
    merchant: tx.merchant || "User Submission",
    type: tx.type,
    region: tx.region,
    riskScore: tx.riskScore,
    status: tx.status,
    cardLast4: "0000",
    ip: "0.0.0.0",
    country: "N/A",
  };
  storedTransactions = [newTx, ...storedTransactions];
  notify();
  return newTx;
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
