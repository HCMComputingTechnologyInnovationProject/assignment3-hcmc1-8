import { ShieldAlert, ShieldCheck } from "lucide-react";

interface ResultDisplayProps {
  prediction: string;
  confidence: number;
}

const ResultDisplay = ({ prediction, confidence }: ResultDisplayProps) => {
  const isFraud = prediction.toLowerCase() === "fraud";
  const percent = (confidence * 100).toFixed(1);

  return (
    <div
      className={`rounded-xl border p-6 text-center transition-all ${
        isFraud
          ? "border-destructive/40 bg-destructive/10 glow-danger"
          : "border-success/40 bg-success/10 glow-success"
      }`}
    >
      <div className="flex justify-center mb-3">
        {isFraud ? (
          <ShieldAlert className="h-12 w-12 text-destructive" />
        ) : (
          <ShieldCheck className="h-12 w-12 text-success" />
        )}
      </div>
      <h3 className={`font-display text-2xl font-bold mb-1 ${isFraud ? "text-destructive" : "text-success"}`}>
        {isFraud ? "Fraud Detected" : "Transaction Safe"}
      </h3>
      <p className="text-muted-foreground text-sm">
        Confidence: <span className="font-display font-semibold text-foreground">{percent}%</span>
      </p>
    </div>
  );
};

export default ResultDisplay;
