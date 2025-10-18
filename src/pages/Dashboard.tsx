import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import DataDashboard from "@/components/DataDashboard";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
      
      // Load the most recent file for dashboard
      await loadLatestFile(session.user.id);
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadLatestFile = async (userId: string) => {
    try {
      setLoadingFile(true);
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          file_id,
          uploaded_files!chat_sessions_file_id_fkey(id, file_name, file_path)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionsError) throw sessionsError;

      if (sessions && sessions.length > 0 && sessions[0].uploaded_files) {
        const fileInfo = sessions[0].uploaded_files;
        setFileName(fileInfo.file_name);

        const { data: fileContentData, error: downloadError } = await supabase
          .storage
          .from('uploads')
          .download(fileInfo.file_path);

        if (!downloadError && fileContentData) {
          const text = await fileContentData.text();
          setFileContent(text);
        }
      }
    } catch (error: any) {
      console.error('Error loading file:', error);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log("Sign out error (ignored):", error);
    }
    
    setUser(null);
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/auth");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Neurika.ai Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">Data Overview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/chat")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loadingFile ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Loading dashboard...</p>
            </CardContent>
          </Card>
        ) : fileContent ? (
          <DataDashboard fileContent={fileContent} fileName={fileName} />
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No data uploaded yet. Please upload a file to view the dashboard.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;