import { Link } from "react-router-dom";
import { Shield, ArrowRight, Activity, BarChart3, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary font-display">
            <Shield className="h-4 w-4" />
            AI-Powered Protection
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            <span className="text-gradient">Fraud Detection</span>
            <br />
            <span className="text-foreground">System</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Analyze financial transactions in real-time using machine learning.
            Detect fraudulent activity with high accuracy and protect your assets.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-display tracking-wider px-8 py-6 text-base">
              <Link to="/predict">
                Start Prediction <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-secondary font-display tracking-wider px-8 py-6 text-base">
              <Link to="/dashboard">
                View Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50 px-4 py-16">
        <div className="container mx-auto grid gap-8 md:grid-cols-3">
          {[
            { icon: Activity, title: "Real-Time Analysis", desc: "Instant transaction scoring with sub-second response times." },
            { icon: Brain, title: "ML Powered", desc: "Logistic Regression model trained on real-world fraud datasets." },
            { icon: BarChart3, title: "Visual Insights", desc: "Interactive dashboards to monitor trends and feature importance." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 transition-colors">
              <div className="inline-flex rounded-lg bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
