import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

interface FileUploadProps {
  onFileUploaded: (fileId: string) => void;
}

const FileUpload = ({ onFileUploaded }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('datasets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store metadata in database
      const { data, error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "File uploaded successfully",
        description: `${file.name} is ready for analysis.`,
      });

      onFileUploaded(data.id);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Upload Your Dataset
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file to start analyzing your data with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <label htmlFor="file-upload">
              <Button disabled={uploading} asChild>
                <span className="cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: CSV, XLSX, XLS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;