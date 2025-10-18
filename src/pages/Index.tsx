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

      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl gradient-primary">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
            </div>
            <span className="text-lg sm:text-xl font-semibold">Neurika</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-xs sm:text-sm px-2 sm:px-4">
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="gradient-primary text-gray-800 text-xs sm:text-sm px-3 sm:px-4 font-semibold"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-46 pb-12 sm:pt-48 sm:pb-20 md:pt-46 lg:pt-46 md:pb-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-6 sm:space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-primary/20 bg-primary/5 text-xs sm:text-sm text-muted-foreground animate-slide-up">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              AI-Powered Data Intelligence
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight tracking-tight animate-slide-up animate-delay-100 px-2">
              Transform Data Into
              <span className="block leading-[1.4] text-gradient mt-2">Actionable Insights</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up animate-delay-200 px-4">
              Upload your data, ask questions in natural language, and get instant AI-powered insights with beautiful
              visualizations.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4 animate-slide-up animate-delay-300 px-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="gradient-primary text-gray-800 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto font-semibold"
              >
                Start Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl border-2 w-full sm:w-auto"
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 md:py-32 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="space-y-3 sm:space-y-4 p-6 sm:p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Smart Analysis</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                AI algorithms analyze your data and deliver intelligent insights instantly.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4 p-6 sm:p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in animate-delay-100">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Lightning Fast</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Process large datasets in seconds with optimized infrastructure.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4 p-6 sm:p-8 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in animate-delay-200">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold">Secure & Private</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Your data is encrypted and never shared with third parties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 md:py-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6 sm:space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight px-2">Ready to get started?</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Join thousands making smarter decisions with AI-powered data analysis.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="gradient-primary text-gray-800 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto max-w-xs mx-auto font-semibold"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-primary">
                <Brain className="w-4 h-4 text-gray-800" />
              </div>
              <span className="text-sm font-medium">Neurika</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              © 2025 Neurika. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
