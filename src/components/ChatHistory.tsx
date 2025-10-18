import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
  file_id: string | null;
  file_name: string | null;
}

interface ChatHistoryProps {
  onSessionSelect?: (sessionId: string, fileId: string, fileName: string) => void;
}

const ChatHistory = ({ onSessionSelect }: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          file_id,
          uploaded_files(file_name),
          chat_messages(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSessions = data?.map(session => ({
        id: session.id,
        title: session.title || 'Untitled Session',
        created_at: session.created_at,
        message_count: session.chat_messages?.[0]?.count || 0,
        file_id: session.file_id,
        file_name: session.uploaded_files?.file_name || null,
      })) || [];

      setSessions(formattedSessions);
    } catch (error: any) {
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Loading history...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No chat history yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start a conversation to see your history here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSessionClick = (session: Session) => {
    if (onSessionSelect && session.file_id && session.file_name) {
      onSessionSelect(session.id, session.file_id, session.file_name);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {sessions.map((session) => (
        <Card 
          key={session.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleSessionClick(session)}
        >
          <CardHeader>
            <CardTitle className="text-lg">{session.title}</CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {session.message_count} messages
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default ChatHistory;