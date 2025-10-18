import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface QAPair {
  id: string;
  question: string;
  observation_content: string | null;
  interpretation_content: string | null;
  actionable_content: string | null;
  keywords: string[];
  is_active: boolean;
  created_at: string;
}

const QAManagement = () => {
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    observation_content: "",
    interpretation_content: "",
    actionable_content: "",
    keywords: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchQAPairs();
  }, []);

  const fetchQAPairs = async () => {
    try {
      const { data, error } = await supabase
        .from("qa_pairs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQaPairs(data || []);
    } catch (error) {
      console.error("Error fetching Q&A pairs:", error);
      toast({
        title: "Error",
        description: "Failed to load Q&A pairs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const keywords = formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);

      if (!formData.question || keywords.length === 0) {
        toast({
          title: "Validation Error",
          description: "Question and at least one keyword are required",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const qaData = {
        question: formData.question,
        observation_content: formData.observation_content || null,
        interpretation_content: formData.interpretation_content || null,
        actionable_content: formData.actionable_content || null,
        keywords,
        is_active: formData.is_active,
        user_id: user.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("qa_pairs")
          .update(qaData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Q&A pair updated" });
      } else {
        const { error } = await supabase.from("qa_pairs").insert(qaData);

        if (error) throw error;
        toast({ title: "Success", description: "Q&A pair created" });
      }

      resetForm();
      fetchQAPairs();
    } catch (error) {
      console.error("Error saving Q&A pair:", error);
      toast({
        title: "Error",
        description: "Failed to save Q&A pair",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (qa: QAPair) => {
    setEditingId(qa.id);
    setFormData({
      question: qa.question,
      observation_content: qa.observation_content || "",
      interpretation_content: qa.interpretation_content || "",
      actionable_content: qa.actionable_content || "",
      keywords: qa.keywords.join(", "),
      is_active: qa.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Q&A pair?")) return;

    try {
      const { error } = await supabase.from("qa_pairs").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Q&A pair deleted" });
      fetchQAPairs();
    } catch (error) {
      console.error("Error deleting Q&A pair:", error);
      toast({
        title: "Error",
        description: "Failed to delete Q&A pair",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      question: "",
      observation_content: "",
      interpretation_content: "",
      actionable_content: "",
      keywords: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Q&A Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage predefined question and answer pairs for your AI assistant
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Q&A Pair
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit" : "Create"} Q&A Pair</CardTitle>
            <CardDescription>
              Fill in the details for your predefined Q&A pair
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Textarea
                id="question"
                placeholder="Enter the question..."
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords * (comma separated)</Label>
              <Input
                id="keywords"
                placeholder="e.g., glioblastoma, survival, factors"
                value={formData.keywords}
                onChange={(e) =>
                  setFormData({ ...formData, keywords: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                These keywords are used to match user questions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observation">Observation Content</Label>
              <Textarea
                id="observation"
                placeholder="Factual observations from the data..."
                value={formData.observation_content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observation_content: e.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interpretation">Interpretation Content</Label>
              <Textarea
                id="interpretation"
                placeholder="Deeper insights and analysis..."
                value={formData.interpretation_content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    interpretation_content: e.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionable">Actionable Conclusion</Label>
              <Textarea
                id="actionable"
                placeholder="Practical recommendations..."
                value={formData.actionable_content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actionable_content: e.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {qaPairs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No Q&A pairs yet. Create your first one!
              </p>
            </CardContent>
          </Card>
        ) : (
          qaPairs.map((qa) => (
            <Card key={qa.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{qa.question}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {qa.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                      {!qa.is_active && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(qa)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(qa.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {qa.observation_content && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Observation</h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {qa.observation_content}
                    </p>
                  </div>
                )}
                {qa.interpretation_content && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      Interpretation
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {qa.interpretation_content}
                    </p>
                  </div>
                )}
                {qa.actionable_content && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      Actionable Conclusion
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {qa.actionable_content}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default QAManagement;