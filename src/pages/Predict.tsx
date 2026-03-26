import { useState } from "react";
import InputForm from "@/components/InputForm";
import ResultDisplay from "@/components/ResultDisplay";
import { toast } from "@/hooks/use-toast";

interface PredictionResult {
  prediction: string;
  confidence: number;
}

const Predict = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const handleSubmit = async (data: { amount: number; time?: number }) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: data.amount,
          time: data.time ?? 0,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const json = await response.json();
      setResult({
        prediction: json.prediction ?? (json.is_fraud ? "Fraud" : "Not Fraud"),
        confidence: json.confidence ?? json.probability ?? 0.5,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({
        title: "Prediction Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">Transaction Analysis</h1>
          <p className="text-muted-foreground text-sm">Enter transaction details to check for fraud.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {result && <ResultDisplay prediction={result.prediction} confidence={result.confidence} />}
      </div>
    </div>
  );
};

export default Predict;
