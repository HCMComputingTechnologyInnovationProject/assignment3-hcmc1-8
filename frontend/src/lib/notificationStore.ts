export type NotificationLevel = "safe" | "medium" | "fraud";

export interface PredictionNotification {
  id: string;
  timestamp: string;
  level: NotificationLevel;
  prediction: "Fraud" | "Not Fraud";
  riskScore: number;
  confidence: number;
  amount: number;
  productCode: string;
  modelName: string;
  transactionId: string;
}

const STORAGE_KEY = "sentinel_notifications";
const MAX_NOTIFICATIONS = 100;

function getLevel(riskScore: number, isFraud: boolean): NotificationLevel {
  if (isFraud) return "fraud";
  if (riskScore >= 40) return "medium";
  return "safe";
}

export function getNotifications(): PredictionNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PredictionNotification[];
  } catch {
    return [];
  }
}

export function addNotification(entry: Omit<PredictionNotification, "id" | "timestamp" | "level">): PredictionNotification {
  const notifications = getNotifications();
  const newNotification: PredictionNotification = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level: getLevel(entry.riskScore, entry.prediction === "Fraud"),
  };
  const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("sentinel-notifications-updated"));
  return newNotification;
}

export function clearNotifications(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("sentinel-notifications-updated"));
}
