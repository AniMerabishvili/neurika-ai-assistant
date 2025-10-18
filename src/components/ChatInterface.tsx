import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Eye, Brain, Target } from "lucide-react";
import ReasoningCard from "@/components/ReasoningCard";

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
}

const ChatInterface = ({ fileId, fileName, sessionId: propSessionId, onSessionCreated }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(propSessionId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (propSessionId) {
      setSessionId(propSessionId);
      loadSessionMessages(propSessionId);
    } else if (fileId && !sessionId) {
      createSession();
    }
  }, [fileId, propSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          observation: msg.observation || undefined,
          interpretation: msg.interpretation || undefined,
          actionable_conclusion: msg.actionable_conclusion || undefined,
        }));
        setMessages(formattedMessages);
      }
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionTitle = fileName ? `Analysis: ${fileName}` : "New Analysis";

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          file_id: fileId,
          title: sessionTitle,
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      if (onSessionCreated) {
        onSessionCreated(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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

      // Call AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-data', {
        body: {
          question: input,
          fileId,
          sessionId,
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
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <div className="h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ask me anything about your data!</p>
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
                  <div className="space-y-4">
                    {message.observation && (
                      <ReasoningCard
                        icon={<Eye className="w-5 h-5" />}
                        title="Observation"
                        content={message.observation}
                        color="observation"
                      />
                    )}
                    {message.interpretation && (
                      <ReasoningCard
                        icon={<Brain className="w-5 h-5" />}
                        title="Interpretation"
                        content={message.interpretation}
                        color="interpretation"
                      />
                    )}
                    {message.actionable_conclusion && (
                      <ReasoningCard
                        icon={<Target className="w-5 h-5" />}
                        title="Actionable Conclusion"
                        content={message.actionable_conclusion}
                        color="actionable"
                      />
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