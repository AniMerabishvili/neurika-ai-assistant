import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clock, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  refreshTrigger?: number;
}

const ChatHistory = ({ onSessionSelect, refreshTrigger }: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

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
          uploaded_files!chat_sessions_file_id_fkey(file_name),
          chat_messages(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        throw error;
      }

      console.log('Fetched sessions:', data);

      const formattedSessions = data?.map(session => ({
        id: session.id,
        title: session.title || 'Untitled Session',
        created_at: session.created_at,
        message_count: session.chat_messages?.[0]?.count || 0,
        file_id: session.file_id,
        file_name: session.uploaded_files?.file_name || null,
      })) || [];

      console.log('Formatted sessions:', formattedSessions);

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

  const handleDeleteClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setSelectedSession(session);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setSelectedSession(session);
    setNewTitle(session.title);
    setRenameDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSession) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', selectedSession.id);

      if (error) throw error;

      setSessions(sessions.filter(s => s.id !== selectedSession.id));
      toast({
        title: "Chat deleted",
        description: "The chat has been successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting chat",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const confirmRename = async () => {
    if (!selectedSession || !newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: newTitle.trim() })
        .eq('id', selectedSession.id);

      if (error) throw error;

      setSessions(sessions.map(s => 
        s.id === selectedSession.id ? { ...s, title: newTitle.trim() } : s
      ));
      toast({
        title: "Chat renamed",
        description: "The chat has been successfully renamed.",
      });
    } catch (error: any) {
      toast({
        title: "Error renaming chat",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRenameDialogOpen(false);
      setSelectedSession(null);
      setNewTitle("");
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleSessionClick(session)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {session.message_count} messages
                    </span>
                  </CardDescription>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleRenameClick(e, session)}
                    className="h-8 w-8"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteClick(e, session)}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedSession?.title}" and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat session.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                confirmRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!newTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatHistory;