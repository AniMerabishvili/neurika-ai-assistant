import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Eye, Brain, Target, FileSpreadsheet } from "lucide-react";
import ReasoningCard from "@/components/ReasoningCard";
import DataDashboard from "@/components/DataDashboard";

const determineRelevantCard = (question: string): "observation" | "interpretation" | "actionable" => {
  const lowerQ = question.toLowerCase();
  
  // Keywords for actionable conclusions (business/strategic questions)
  const actionableKeywords = ['should', 'recommend', 'suggest', 'best', 'strategy', 'increase', 'improve', 'optimize', 'maximize', 'business', 'profit', 'sales', 'grow', 'invest'];
  
  // Keywords for interpretation (analytical/comparative questions)
  const interpretationKeywords = ['why', 'compare', 'relationship', 'correlation', 'trend', 'pattern', 'difference', 'affect', 'impact', 'meaning', 'significant'];
  
  // Check for actionable keywords
  if (actionableKeywords.some(keyword => lowerQ.includes(keyword))) {
    return "actionable";
  }
  
  // Check for interpretation keywords
  if (interpretationKeywords.some(keyword => lowerQ.includes(keyword))) {
    return "interpretation";
  }
  
  // Default to observation for factual/descriptive questions (what, which, when, how many)
  return "observation";
};

interface ChatInterfaceProps {
  fileId: string | null;
  fileName?: string;
  sessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  observation?: string;
  interpretation?: string;
  actionable_conclusion?: string;
  relevantCard?: "observation" | "interpretation" | "actionable";
}

interface SessionInfo {
  sessionId: string;
  fileId: string;
  fileName: string;
}

const ChatInterface = ({ fileId, fileName, sessionId: propSessionId, onSessionCreated }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(propSessionId || null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (propSessionId) {
      setSessionId(propSessionId);
      loadSessionWithFile(propSessionId);
    } else if (fileId && !sessionId) {
      createSession();
    }
  }, [fileId, propSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessionWithFile = async (sessionId: string) => {
    try {
      setLoadingFile(true);
      
      // Load session info with file details
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          file_id,
          uploaded_files!chat_sessions_file_id_fkey(id, file_name, file_path)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      if (sessionData && sessionData.uploaded_files) {
        const fileInfo = {
          sessionId: sessionData.id,
          fileId: sessionData.file_id!,
          fileName: sessionData.uploaded_files.file_name,
        };
        setSessionInfo(fileInfo);
        console.log('Loaded session info:', sessionData);

        // Download file content for dashboard
        const { data: fileContentData, error: downloadError } = await supabase
          .storage
          .from('uploads')
          .download(sessionData.uploaded_files.file_path);

        if (!downloadError && fileContentData) {
          const text = await fileContentData.text();
          setFileContent(text);
          console.log('Loaded file content, length:', text.length);
        }
      }

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (messagesData) {
        const formattedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          observation: msg.observation || undefined,
          interpretation: msg.interpretation || undefined,
          actionable_conclusion: msg.actionable_conclusion || undefined,
        }));
        setMessages(formattedMessages);
        console.log('Loaded messages:', formattedMessages.length);
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      toast({
        title: "Error loading session",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingFile(false);
    }
  };

  const loadFileContent = async (fileId: string) => {
    try {
      setLoadingFile(true);
      
      const { data: fileData, error: fileError } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (fileError || !fileData) return;

      const { data: fileContentData, error: downloadError } = await supabase
        .storage
        .from('uploads')
        .download(fileData.file_path);

      if (!downloadError && fileContentData) {
        const text = await fileContentData.text();
        setFileContent(text);
        console.log('Loaded file content for new session, length:', text.length);
      }
    } catch (error: any) {
      console.error('Error loading file content:', error);
    } finally {
      setLoadingFile(false);
    }
  };

  const createSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionTitle = fileName ? `Analysis: ${fileName}` : "New Analysis";

      console.log('Creating session with:', { user_id: user.id, file_id: fileId, title: sessionTitle });

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          file_id: fileId,
          title: sessionTitle,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      console.log('Session created:', data);
      setSessionId(data.id);
      
      // Set session info and load file content
      if (fileId && fileName) {
        const info = {
          sessionId: data.id,
          fileId: fileId,
          fileName: fileName,
        };
        setSessionInfo(info);
        
        // Load file content for new session
        await loadFileContent(fileId);
      }
      
      if (onSessionCreated) {
        onSessionCreated(data.id);
      }

      toast({
        title: "Chat session created",
        description: `Ready to analyze ${fileName || 'your data'}`,
      });
    } catch (error: any) {
      console.error('Session creation failed:', error);
      toast({
        title: "Error creating session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const questionText = input;
    const relevantCard = determineRelevantCard(questionText);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: questionText,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save user message
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content: input,
      });

      // Call AI analysis with focused card type
      const currentFileId = sessionInfo?.fileId || fileId;
      console.log('Calling AI with fileId:', currentFileId, 'cardType:', relevantCard);
      
      const { data, error } = await supabase.functions.invoke('analyze-data', {
        body: {
          question: input,
          fileId: currentFileId,
          sessionId,
          cardType: relevantCard, // Pass the determined card type
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        observation: data.observation,
        interpretation: data.interpretation,
        actionable_conclusion: data.actionable_conclusion,
        relevantCard: relevantCard,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: data.content,
        observation: data.observation,
        interpretation: data.interpretation,
        actionable_conclusion: data.actionable_conclusion,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!fileId) {
    return (
      <Card className="max-w-2xl mx-auto p-12 text-center">
        <p className="text-muted-foreground">
          Please upload a dataset first to start chatting
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Data Dashboard */}
      {fileContent && sessionInfo && !loadingFile && (
        <DataDashboard fileContent={fileContent} fileName={sessionInfo.fileName} />
      )}
      
      {loadingFile && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">Loading dashboard...</p>
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-lg">
        <div className="h-[600px] flex flex-col">
          {/* File Info Header */}
          {sessionInfo && (
            <div className="border-b bg-muted/30 px-6 py-3">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="font-medium">Analyzing:</span>
                <span className="text-muted-foreground">{sessionInfo.fileName}</span>
              </div>
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ask me anything about your data!</p>
                {sessionInfo && (
                  <p className="text-sm mt-2">
                    All questions will be analyzed using: <span className="font-medium">{sessionInfo.fileName}</span>
                  </p>
                )}
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-[80%]">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ReasoningCard
                      icon={<Eye className="w-5 h-5" />}
                      title="Observation"
                      content={message.observation || "No observation available"}
                      color="observation"
                      isOpen={message.relevantCard === "observation"}
                    />
                    <ReasoningCard
                      icon={<Brain className="w-5 h-5" />}
                      title="Interpretation"
                      content={message.interpretation || "No interpretation available"}
                      color="interpretation"
                      isOpen={message.relevantCard === "interpretation"}
                    />
                    <ReasoningCard
                      icon={<Target className="w-5 h-5" />}
                      title="Actionable Conclusion"
                      content={message.actionable_conclusion || "No actionable conclusion available"}
                      color="actionable"
                      isOpen={message.relevantCard === "actionable"}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !loading && handleSend()}
                placeholder="Ask a question about your data..."
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;