import { useCallback, useEffect, useRef, useState } from "react";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "w9", label: "W-9" },
  { value: "business_license", label: "Business license" },
  { value: "insurance_proof", label: "Proof of insurance" },
  { value: "compliance_cert", label: "Compliance certificate" },
  { value: "other", label: "Other" },
];

interface LegalDoc {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  notes: string | null;
  created_at: string;
}

export function LegalDocumentsSection({ clientId }: { clientId: string | null }) {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("w9");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("client_legal_documents" as any)
      .select("id, document_type, document_name, file_url, notes, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setDocs(((data || []) as any[]) as LegalDoc[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload() {
    if (!clientId) { toast.error("No workspace selected"); return; }
    if (!file) { toast.error("Choose a file first"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("client-legal-documents")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("client_legal_documents" as any).insert({
      client_id: clientId,
      document_type: docType,
      document_name: file.name,
      file_url: path,
      notes: notes.trim() || null,
      uploaded_by: userData?.user?.id ?? null,
    } as any);

    if (insErr) {
      toast.error("Could not save document: " + insErr.message);
      setUploading(false);
      return;
    }

    toast.success("Document uploaded");
    setFile(null);
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
    load();
  }

  async function openDoc(path: string) {
    if (/^https?:\/\//i.test(path)) { window.open(path, "_blank"); return; }
    const { data, error } = await supabase.storage
      .from("client-legal-documents")
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) { toast.error("Could not open document"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <DataCard title="Legal & Compliance Documents">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File</Label>
            <Input
              ref={fileRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything we should know about this document"
          />
        </div>
        <Button onClick={handleUpload} disabled={uploading || !file} size="sm">
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload document
        </Button>

        <div className="pt-2 border-t border-border">
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : docs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-1">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-t border-border first:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm truncate block">{d.document_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {DOC_TYPES.find((t) => t.value === d.document_type)?.label || d.document_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDoc(d.file_url)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DataCard>
  );
}

export default LegalDocumentsSection;
