import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, MessageSquare, TrendingUp, Zap, Shield, Database, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("code")) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (!error) {
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate("/dashboard");
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      } else {
        setIsChecking(false);
      }
    };

    init();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms analyze your data and provide intelligent insights.",
    },
    {
      icon: MessageSquare,
      title: "Natural Conversations",
      description: "Chat with your data using natural language and get instant, accurate responses.",
    },
    {
      icon: TrendingUp,
      title: "Data Visualization",
      description: "Transform complex datasets into beautiful, interactive charts and dashboards.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process and analyze large datasets in seconds with our optimized infrastructure.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and secure. We never share your information with third parties.",
    },
    {
      icon: Database,
      title: "Multi-Format Support",
      description: "Upload CSV, Excel, JSON and more. We handle all common data formats seamlessly.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent gradient-primary">
              Neurika.ai
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")} className="gradient-primary text-white">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero py-20 md:py-32 animate-fade-in">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Transform Your Data Into
              <span className="block gradient-primary bg-clip-text text-transparent">
                Intelligent Insights
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Neurika.ai is your AI-powered data assistant. Upload your data, ask questions in natural language, 
              and get instant insights with beautiful visualizations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="gradient-primary text-white text-lg px-8 py-6 group"
              >
                Start Analyzing Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6"
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Master Your Data
            </h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed to make data analysis simple, fast, and accessible to everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
            <h3 className="text-3xl md:text-5xl font-bold">
              Ready to Unlock Your Data's Potential?
            </h3>
            <p className="text-lg text-muted-foreground">
              Join thousands of users who are already making smarter decisions with AI-powered data analysis.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="gradient-primary text-white text-lg px-8 py-6"
            >
              Get Started for Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">Neurika.ai</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Neurika.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
