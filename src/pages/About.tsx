import { Shield, Code, Cpu, Database } from "lucide-react";

const techs = [
  { icon: Code, name: "React.js", desc: "Modern front-end framework with hooks and functional components." },
  { icon: Cpu, name: "FastAPI", desc: "High-performance Python backend serving the ML model." },
  { icon: Database, name: "Logistic Regression", desc: "Supervised ML model trained on labeled transaction data." },
];

const About = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex rounded-full bg-primary/10 p-4">
          <Shield className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">About FraudShield</h1>
        <p className="text-muted-foreground leading-relaxed">
          FraudShield is an AI-powered fraud detection system that analyzes financial transactions
          in real-time. Using a Logistic Regression model trained on the popular credit card fraud
          dataset, it classifies transactions as fraudulent or legitimate with high confidence scores.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Technologies Used</h2>
        <div className="grid gap-4">
          {techs.map(({ icon: Icon, name, desc }) => (
            <div key={name} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
              <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">{name}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-display text-xl font-semibold text-foreground">How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm leading-relaxed">
          <li>Enter the transaction amount and optional time parameter.</li>
          <li>The data is sent to a FastAPI backend running the ML model.</li>
          <li>The model evaluates the transaction features and returns a prediction.</li>
          <li>Results are displayed with a confidence score and color-coded status.</li>
        </ol>
      </div>
    </div>
  );
};

export default About;
