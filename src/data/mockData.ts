export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  merchant: string;
  type: string;
  region: string;
  riskScore: number;
  status: "approved" | "flagged" | "blocked";
  cardLast4: string;
  ip: string;
  country: string;
}

export interface Alert {
  id: string;
  transactionId: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  description: string;
  timestamp: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  riskScore: number;
  amount: number;
  merchant: string;
}

export const transactions: Transaction[] = [
  { id: "TXN-001", timestamp: "2026-03-29T14:23:11Z", amount: 12450.00, currency: "USD", merchant: "Apex Electronics Ltd", type: "Wire Transfer", region: "Eastern Europe", riskScore: 94, status: "flagged", cardLast4: "4821", ip: "185.220.101.34", country: "Romania" },
  { id: "TXN-002", timestamp: "2026-03-29T14:18:45Z", amount: 3200.00, currency: "USD", merchant: "CloudTech Services", type: "Card Payment", region: "North America", riskScore: 12, status: "approved", cardLast4: "7392", ip: "104.28.12.56", country: "United States" },
  { id: "TXN-003", timestamp: "2026-03-29T14:15:32Z", amount: 8750.00, currency: "EUR", merchant: "Global Imports GmbH", type: "Wire Transfer", region: "Western Europe", riskScore: 67, status: "flagged", cardLast4: "1156", ip: "91.198.174.192", country: "Germany" },
  { id: "TXN-004", timestamp: "2026-03-29T14:12:08Z", amount: 450.00, currency: "USD", merchant: "Amazon.com", type: "Card Payment", region: "North America", riskScore: 5, status: "approved", cardLast4: "9934", ip: "72.21.206.80", country: "United States" },
  { id: "TXN-005", timestamp: "2026-03-29T14:08:55Z", amount: 28900.00, currency: "USD", merchant: "Unknown Merchant", type: "Crypto Exchange", region: "Southeast Asia", riskScore: 98, status: "blocked", cardLast4: "3367", ip: "103.152.118.24", country: "Vietnam" },
  { id: "TXN-006", timestamp: "2026-03-29T14:05:22Z", amount: 1890.00, currency: "GBP", merchant: "Harrods Ltd", type: "Card Payment", region: "Western Europe", riskScore: 8, status: "approved", cardLast4: "5541", ip: "51.148.32.95", country: "United Kingdom" },
  { id: "TXN-007", timestamp: "2026-03-29T14:01:19Z", amount: 15600.00, currency: "USD", merchant: "Shell Corp International", type: "Wire Transfer", region: "Caribbean", riskScore: 89, status: "flagged", cardLast4: "2278", ip: "200.9.59.14", country: "Cayman Islands" },
  { id: "TXN-008", timestamp: "2026-03-29T13:57:44Z", amount: 675.00, currency: "USD", merchant: "Uber Technologies", type: "Card Payment", region: "North America", riskScore: 3, status: "approved", cardLast4: "8815", ip: "162.158.62.91", country: "United States" },
  { id: "TXN-009", timestamp: "2026-03-29T13:54:31Z", amount: 42100.00, currency: "USD", merchant: "Offshore Holdings Ltd", type: "Wire Transfer", region: "Middle East", riskScore: 96, status: "blocked", cardLast4: "6643", ip: "185.56.83.12", country: "UAE" },
  { id: "TXN-010", timestamp: "2026-03-29T13:50:18Z", amount: 2340.00, currency: "USD", merchant: "Best Buy", type: "Card Payment", region: "North America", riskScore: 15, status: "approved", cardLast4: "1197", ip: "23.227.38.32", country: "United States" },
  { id: "TXN-011", timestamp: "2026-03-29T13:46:05Z", amount: 7800.00, currency: "USD", merchant: "Rapid Transfer Co", type: "P2P Transfer", region: "West Africa", riskScore: 82, status: "flagged", cardLast4: "4459", ip: "41.190.2.148", country: "Nigeria" },
  { id: "TXN-012", timestamp: "2026-03-29T13:42:52Z", amount: 125.00, currency: "USD", merchant: "Netflix", type: "Subscription", region: "North America", riskScore: 2, status: "approved", cardLast4: "7726", ip: "54.74.73.31", country: "United States" },
];

export const alerts: Alert[] = [
  { id: "ALT-001", transactionId: "TXN-005", severity: "critical", type: "Crypto Laundering Pattern", description: "Large crypto exchange from high-risk jurisdiction with unknown merchant", timestamp: "2026-03-29T14:09:00Z", status: "open", riskScore: 98, amount: 28900, merchant: "Unknown Merchant" },
  { id: "ALT-002", transactionId: "TXN-009", severity: "critical", type: "Offshore Transfer Anomaly", description: "Large wire to offshore holdings with suspicious IP origin", timestamp: "2026-03-29T13:55:00Z", status: "investigating", riskScore: 96, amount: 42100, merchant: "Offshore Holdings Ltd" },
  { id: "ALT-003", transactionId: "TXN-001", severity: "high", type: "Geographic Anomaly", description: "Wire transfer to Eastern Europe from account with no prior history in region", timestamp: "2026-03-29T14:23:30Z", status: "open", riskScore: 94, amount: 12450, merchant: "Apex Electronics Ltd" },
  { id: "ALT-004", transactionId: "TXN-007", severity: "high", type: "Shell Company Detection", description: "Transfer to entity flagged as potential shell company in Caribbean", timestamp: "2026-03-29T14:02:00Z", status: "open", riskScore: 89, amount: 15600, merchant: "Shell Corp International" },
  { id: "ALT-005", transactionId: "TXN-011", severity: "high", type: "Velocity Spike", description: "P2P transfer to high-risk region with unusual velocity pattern", timestamp: "2026-03-29T13:47:00Z", status: "investigating", riskScore: 82, amount: 7800, merchant: "Rapid Transfer Co" },
  { id: "ALT-006", transactionId: "TXN-003", severity: "medium", type: "Amount Outlier", description: "Wire transfer amount significantly deviates from account baseline", timestamp: "2026-03-29T14:16:00Z", status: "open", riskScore: 67, amount: 8750, merchant: "Global Imports GmbH" },
];

export const velocityData = [
  { time: "00:00", transactions: 120, anomalies: 2 },
  { time: "02:00", transactions: 85, anomalies: 1 },
  { time: "04:00", transactions: 45, anomalies: 0 },
  { time: "06:00", transactions: 95, anomalies: 1 },
  { time: "08:00", transactions: 280, anomalies: 4 },
  { time: "10:00", transactions: 420, anomalies: 8 },
  { time: "12:00", transactions: 510, anomalies: 12 },
  { time: "14:00", transactions: 480, anomalies: 15 },
  { time: "16:00", transactions: 390, anomalies: 7 },
  { time: "18:00", transactions: 350, anomalies: 5 },
  { time: "20:00", transactions: 240, anomalies: 3 },
  { time: "22:00", transactions: 180, anomalies: 2 },
];

export const threatDistribution = [
  { region: "Eastern Europe", threats: 34, percentage: 28 },
  { region: "Southeast Asia", threats: 26, percentage: 21 },
  { region: "West Africa", threats: 22, percentage: 18 },
  { region: "Caribbean", threats: 18, percentage: 15 },
  { region: "Middle East", threats: 14, percentage: 11 },
  { region: "Other", threats: 8, percentage: 7 },
];

export const aiInsights = [
  { id: 1, title: "Velocity Anomaly Detected", description: "Transaction velocity in the 12:00-14:00 window is 3.2x above baseline. 15 anomalous transactions identified with geographic clustering in Eastern Europe.", severity: "critical" as const },
  { id: 2, title: "New Shell Company Pattern", description: "ML model identified 3 new entities matching shell company behavioral patterns. Entities registered within 30 days, receiving transfers >$10K from multiple accounts.", severity: "high" as const },
  { id: 3, title: "IP Reputation Shift", description: "IP block 185.220.x.x has shifted from neutral to high-risk based on cross-institution fraud reporting. 4 transactions from this block in the last 6 hours.", severity: "medium" as const },
];

export const revenueTrendData = [
  { month: "Oct 2019", revenue: 116.71, expenses: 45.40 },
  { month: "Nov 2019", revenue: 262.90, expenses: 71.47 },
  { month: "Dec 2019", revenue: 231.35, expenses: 32.54 },
  { month: "Jan 2020", revenue: 214.04, expenses: 19.80 },
  { month: "Feb 2020", revenue: 214.37, expenses: 28.40 },
  { month: "Mar 2020", revenue: 131.59, expenses: 11.48 },
];

export const projectsData = [
  { name: "ERP", value: 32, fill: "#EA580C" }, // Orangeish
  { name: "Consulting Services", value: 20, fill: "#0EA5E9" }, // Light blue
  { name: "OEM Mobile Apps", value: 6, fill: "#84CC16" }, // Lime
  { name: "Certification Program", value: 10, fill: "#3B82F6" }, // Blue
  { name: "App Builder", value: 32, fill: "#1D4ED8" }, // Dark blue
];

export const mapMarkers = [
  { markerOffset: -15, name: "North America", coordinates: [-100, 45], count: 599, color: "#3B82F6" },
  { markerOffset: 15, name: "South America", coordinates: [-60, -15], count: 120, color: "#8B5CF6" },
  { markerOffset: -15, name: "Europe", coordinates: [15, 50], count: 340, color: "#10B981" },
  { markerOffset: 15, name: "Africa", coordinates: [20, 0], count: 80, color: "#F59E0B" },
  { markerOffset: 15, name: "Asia", coordinates: [90, 40], count: 420, color: "#EC4899" },
  { markerOffset: 25, name: "Oceania", coordinates: [140, -25], count: 50, color: "#06B6D4" },
];
