import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Upload, MessageSquare, History, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import FileUpload from "@/components/FileUpload";
import ChatInterface from "@/components/ChatInterface";
import ChatHistory from "@/components/ChatHistory";
import DataDashboard from "@/components/DataDashboard";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "chat" | "history" | "dataDashboard">("upload");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
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
      
      // Load the most recent file for data dashboard
      await loadLatestFile(session.user.id);
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadFileContentById = async (fileId: string, fileName: string) => {
    try {
      setLoadingFile(true);
      
      const { data: fileInfo, error: fileError } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (fileError) throw fileError;

      if (fileInfo) {
        setFileName(fileName);

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
    navigate("/");
  };

  const handleFileUploaded = (fileId: string, fileName: string) => {
    setSelectedFileId(fileId);
    setSelectedFileName(fileName);
    setSelectedSessionId(null);
    setActiveTab("chat");
  };

  const handleSessionSelected = async (sessionId: string, fileId: string, fileName: string) => {
    setSelectedSessionId(sessionId);
    setSelectedFileId(fileId);
    setSelectedFileName(fileName);
    setActiveTab("chat");
    
    // Load the file content for the Data Dashboard
    await loadFileContentById(fileId, fileName);
  };

  const handleSessionCreated = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
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
                Neurika.ai
              </h1>
              <p className="text-xs text-muted-foreground">AI Data Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Data
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === "chat"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === "history"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setActiveTab("dataDashboard")}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === "dataDashboard"
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Data Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === "upload" && <FileUpload onFileUploaded={handleFileUploaded} />}
        {activeTab === "chat" && (
          <ChatInterface 
            fileId={selectedFileId} 
            fileName={selectedFileName || undefined}
            sessionId={selectedSessionId}
            onSessionCreated={handleSessionCreated}
          />
        )}
        {activeTab === "history" && (
          <ChatHistory 
            onSessionSelect={handleSessionSelected}
            refreshTrigger={historyRefreshTrigger}
          />
        )}
        {activeTab === "dataDashboard" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;