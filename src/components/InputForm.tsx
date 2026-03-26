import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ScanSearch } from "lucide-react";

interface InputFormProps {
  onSubmit: (data: { amount: number; time?: number }) => void;
  isLoading: boolean;
}

const InputForm = ({ onSubmit, isLoading }: InputFormProps) => {
  const [amount, setAmount] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; time?: string }>({});

  const validate = () => {
    const newErrors: { amount?: string; time?: string } = {};
    if (!amount.trim()) {
      newErrors.amount = "Transaction amount is required";
    } else if (isNaN(Number(amount)) || Number(amount) < 0) {
      newErrors.amount = "Must be a valid positive number";
    }
    if (time.trim() && (isNaN(Number(time)) || Number(time) < 0)) {
      newErrors.time = "Must be a valid positive number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      amount: Number(amount),
      time: time.trim() ? Number(time) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium text-foreground">
          Transaction Amount <span className="text-destructive">*</span>
        </Label>
        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 149.99"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: undefined })); }}
          className="bg-secondary border-border focus:border-primary focus:ring-primary"
        />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="time" className="text-sm font-medium text-foreground">
          Transaction Time <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="time"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 43200"
          value={time}
          onChange={(e) => { setTime(e.target.value); setErrors(prev => ({ ...prev, time: undefined })); }}
          className="bg-secondary border-border focus:border-primary focus:ring-primary"
        />
        {errors.time && <p className="text-sm text-destructive">{errors.time}</p>}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-display text-sm tracking-wider"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
        ) : (
          <><ScanSearch className="mr-2 h-4 w-4" /> Predict</>
        )}
      </Button>
    </form>
  );
};

export default InputForm;
