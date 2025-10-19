import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Eye, Brain, Target, FileSpreadsheet } from "lucide-react";
import ReasoningCard from "@/components/ReasoningCard";

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
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvAnalyzed, setCsvAnalyzed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionCreatingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset session creating flag when fileId changes
    sessionCreatingRef.current = false;
    
    if (propSessionId) {
      setSessionId(propSessionId);
      loadSessionWithFile(propSessionId);
    } else if (fileId && !sessionId && !sessionCreatingRef.current) {
      // Check if a session already exists for this file
      checkAndCreateSession();
    }
  }, [fileId, propSessionId]);

  const checkAndCreateSession = async () => {
    if (sessionCreatingRef.current || !fileId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if a session already exists for this file
      const { data: existingSessions, error: checkError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('file_id', fileId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) throw checkError;

      if (existingSessions && existingSessions.length > 0) {
        console.log('Session already exists for this file, using existing session:', existingSessions[0].id);
        setSessionId(existingSessions[0].id);
        loadSessionWithFile(existingSessions[0].id);
        return;
      }

      // No existing session found, create a new one
      await createSession();
    } catch (error) {
      console.error('Error checking for existing session:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadCsvContent = async (fileIdToLoad: string) => {
    try {
      const { data: fileData } = await supabase
        .from('uploaded_files')
        .select('file_path')
        .eq('id', fileIdToLoad)
        .single();

      if (!fileData) return;

      // Download the file content from storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('uploads')
        .download(fileData.file_path);

      if (storageError) throw storageError;

      const text = await storageData.text();
      setCsvContent(text);
      setCsvAnalyzed(false);
      console.log('CSV content loaded, size:', text.length);
    } catch (error) {
      console.error('Error loading CSV content:', error);
    }
  };

  const loadSessionWithFile = async (sessionId: string) => {
    try {
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
        
        // Load CSV content for Eurika
        if (sessionData.file_id) {
          await loadCsvContent(sessionData.file_id);
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
        
        // If there are existing messages, CSV was already analyzed
        if (formattedMessages.length > 0) {
          setCsvAnalyzed(true);
        }
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      toast({
        title: "Error loading session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createSession = async () => {
    if (sessionCreatingRef.current) {
      console.log('Session creation already in progress, skipping...');
      return;
    }

    try {
      sessionCreatingRef.current = true;
      
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
      
      // Set session info
      if (fileId && fileName) {
        const info = {
          sessionId: data.id,
          fileId: fileId,
          fileName: fileName,
        };
        setSessionInfo(info);
        
        // Load CSV content for Eurika
        await loadCsvContent(fileId);
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
      sessionCreatingRef.current = false;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const questionText = input;

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
        content: questionText,
      });

      // Prepare messages for Eurika
      const conversationMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Add current user message
      conversationMessages.push({
        role: 'user',
        content: questionText,
      });

      // Call Eurika with CSV content on first message
      const { data, error } = await supabase.functions.invoke('chat-with-eurika', {
        body: {
          messages: conversationMessages,
          csvContent: !csvAnalyzed && csvContent ? csvContent : undefined,
        },
      });

      console.log('Eurika response:', data);

      if (error) throw error;

      // If there's an analysis, display it first
      if (data.analysis && !csvAnalyzed) {
        console.log('Displaying CSV analysis...');
        const analysisText = `🔍 **AUTOMATIC DATA SCAN COMPLETE:**\n\n${data.analysis.summary}\n\n**Column Details:**\n${data.analysis.columnAnalysis.map((col: any) => 
          `- ${col.name}: ${col.type} (${col.uniqueCount} unique values${col.missingCount > 0 ? `, ${col.missingCount} missing` : ''})`
        ).join('\n')}`;
        
        const analysisMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: analysisText,
        };
        
        setMessages(prev => [...prev, analysisMessage]);
        
        // Save analysis message
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          user_id: user.id,
          role: 'assistant',
          content: analysisText,
        });
        
        setCsvAnalyzed(true);
      }

      const aiResponse = data.choices?.[0]?.message?.content || data.generatedText || "I couldn't generate a response.";
      console.log('AI Response:', aiResponse);

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: aiResponse,
      };

      console.log('Adding assistant message to state...');
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
      });

      console.log('Message saved successfully');

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
    <div className="w-full h-[calc(100vh-8.5rem)]">
      <Card className="h-full shadow-none border-0 rounded-none">
        <div className="h-full flex flex-col">
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
                  <div className="w-full">
                    {message.relevantCard === "observation" && (
                      <ReasoningCard
                        icon={<Eye className="w-5 h-5" />}
                        title="Observation"
                        content={message.observation || "No observation available"}
                        color="observation"
                        isOpen={true}
                      />
                    )}
                    {message.relevantCard === "interpretation" && (
                      <ReasoningCard
                        icon={<Brain className="w-5 h-5" />}
                        title="Interpretation"
                        content={message.interpretation || "No interpretation available"}
                        color="interpretation"
                        isOpen={true}
                      />
                    )}
                    {message.relevantCard === "actionable" && (
                      <ReasoningCard
                        icon={<Target className="w-5 h-5" />}
                        title="Actionable Conclusion"
                        content={message.actionable_conclusion || "No actionable conclusion available"}
                        color="actionable"
                        isOpen={true}
                      />
                    )}
                    {!message.relevantCard && (
                      <div className="space-y-4">
                        {message.observation && message.observation !== "No observation available" && (
                          <ReasoningCard
                            icon={<Eye className="w-5 h-5" />}
                            title="Observation"
                            content={message.observation}
                            color="observation"
                            isOpen={true}
                          />
                        )}
                        {message.interpretation && message.interpretation !== "No interpretation available" && (
                          <ReasoningCard
                            icon={<Brain className="w-5 h-5" />}
                            title="Interpretation"
                            content={message.interpretation}
                            color="interpretation"
                            isOpen={true}
                          />
                        )}
                        {message.actionable_conclusion && message.actionable_conclusion !== "No actionable conclusion available" && (
                          <ReasoningCard
                            icon={<Target className="w-5 h-5" />}
                            title="Actionable Conclusion"
                            content={message.actionable_conclusion}
                            color="actionable"
                            isOpen={true}
                          />
                        )}
                      </div>
                    )}
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