import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clientId: string;
  currentUrl: string;
  onUpload: (url: string) => void;
}

export function WebsiteImageUploader({ clientId, currentUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${clientId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("website-media").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("website-media").getPublicUrl(path);
    onUpload(urlData.publicUrl);
    setUploading(false);
    toast.success("Image uploaded");
  };

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={currentUrl} alt={altText} className="w-full h-32 object-cover" />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-1 right-1 h-6 w-6 bg-background/80"
            onClick={() => onUpload("")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-secondary/50 transition-colors"
          disabled={uploading}
        >
          {uploading ? (
            <span className="text-xs text-muted-foreground">Uploading...</span>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to upload</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
    </div>
  );
}
