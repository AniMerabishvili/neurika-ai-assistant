import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Zap, Shield } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl gradient-primary">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">Neurika</span>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              onClick={() => navigate("/auth")}
              className="text-sm"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate("/auth")}
              className="gradient-primary text-white text-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-muted-foreground animate-slide-up">
              <Sparkles className="w-4 h-4 text-primary" />
              AI-Powered Data Intelligence
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight animate-slide-up animate-delay-100">
              Transform Data Into
              <span className="block text-gradient mt-2">
                Actionable Insights
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up animate-delay-200">
              Upload your data, ask questions in natural language, and get instant AI-powered insights with beautiful visualizations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-slide-up animate-delay-300">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="gradient-primary text-white text-base px-8 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Free
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-base px-8 h-12 rounded-xl border-2"
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Smart Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI algorithms analyze your data and deliver intelligent insights instantly.
              </p>
            </div>

            <div className="space-y-4 p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in animate-delay-100">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Process large datasets in seconds with optimized infrastructure.
              </p>
            </div>

            <div className="space-y-4 p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in animate-delay-200">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Secure & Private</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your data is encrypted and never shared with third parties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands making smarter decisions with AI-powered data analysis.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="gradient-primary text-white text-base px-8 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-primary">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">Neurika</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Neurika. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
