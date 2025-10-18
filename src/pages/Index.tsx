import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("code")) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (!error) {
          // Clean URL and go to dashboard after successful OAuth exchange
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate("/dashboard");
          return;
        } else {
          console.error("OAuth exchange error (Index):", error.message);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/dashboard" : "/auth");
    };

    init();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
