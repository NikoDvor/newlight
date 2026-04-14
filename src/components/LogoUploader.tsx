import { useState, useRef, useCallback } from "react";
import { Upload, Link as LinkIcon, X, ZoomIn, ZoomOut, Move, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LogoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  dark?: boolean;
  /** Storage folder prefix — must be a valid client UUID for RLS. Falls back to current user ID. */
  clientId?: string;
}

export function LogoUploader({ value, onChange, label = "Logo", className = "", dark = true, clientId }: LogoUploaderProps) {
  const [mode, setMode] = useState<"upload" | "url">(value && !value.startsWith("blob:") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [scale, setScale] = useState(1);
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = dark
    ? "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
    : "bg-primary/[0.03] border-primary/10 text-foreground placeholder:text-muted-foreground/50";
  const labelCls = dark ? "text-xs text-white/50 mb-1 block" : "text-xs text-muted-foreground mb-1 block";
  const cardBg = dark ? "bg-white/[0.04] border-white/[0.08]" : "bg-primary/[0.02] border-primary/[0.08]";
  const textMuted = dark ? "text-white/40" : "text-muted-foreground";
  const textMain = dark ? "text-white" : "text-foreground";

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or SVG file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setUploading(true);

    // Determine folder: use clientId prop, or fall back to current user's UUID
    let folder = clientId;
    if (!folder) {
      const { data: { user } } = await supabase.auth.getUser();
      folder = user?.id;
    }
    if (!folder) {
      toast.error("Unable to determine upload folder");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("client-logos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("client-logos").getPublicUrl(path);
    onChange(publicUrl);
    setScale(1);
    toast.success("Logo uploaded!");
    setUploading(false);
  }, [onChange]);

  const clearLogo = () => {
    onChange("");
    setScale(1);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${mode === "upload"
            ? (dark ? "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]" : "bg-primary/10 text-primary")
            : (dark ? "text-white/40 hover:text-white/60" : "text-muted-foreground hover:text-foreground")
          }`}
        >
          <Upload className="h-3 w-3 inline mr-1" /> Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${mode === "url"
            ? (dark ? "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]" : "bg-primary/10 text-primary")
            : (dark ? "text-white/40 hover:text-white/60" : "text-muted-foreground hover:text-foreground")
          }`}
        >
          <LinkIcon className="h-3 w-3 inline mr-1" /> Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={dark
              ? "border-white/10 text-white/70 hover:bg-white/10 text-xs h-9"
              : "border-primary/10 text-foreground hover:bg-primary/5 text-xs h-9"
            }
          >
            {uploading ? "Uploading…" : <><Upload className="h-3.5 w-3.5 mr-1.5" /> Choose File</>}
          </Button>
          <p className={`text-[10px] ${textMuted} mt-1`}>PNG, JPG, JPEG, SVG · Max 5MB</p>
        </div>
      ) : (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://your-logo.com/logo.png"
          className={inputCls}
        />
      )}

      {/* Preview */}
      {value && (
        <div className={`mt-3 rounded-xl border p-3 ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>
              <Eye className="h-3 w-3 inline mr-1" /> Preview
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className={`p-1 rounded hover:bg-white/10 ${textMuted}`}>
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className={`text-[10px] ${textMuted} w-8 text-center`}>{Math.round(scale * 100)}%</span>
              <button type="button" onClick={() => setScale(s => Math.min(2, s + 0.1))} className={`p-1 rounded hover:bg-white/10 ${textMuted}`}>
                <ZoomIn className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setObjectFit(f => f === "contain" ? "cover" : "contain")}
                className={`p-1 rounded hover:bg-white/10 ${textMuted} ml-1`}
                title={objectFit === "contain" ? "Switch to Cover" : "Switch to Contain"}
              >
                <Move className="h-3 w-3" />
              </button>
              <button type="button" onClick={clearLogo} className="p-1 rounded hover:bg-red-500/20 text-red-400 ml-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-[repeating-conic-gradient(hsla(0,0%,50%,.1)_0%_25%,transparent_0%_50%)] bg-[size:16px_16px] h-28 overflow-hidden">
            <img
              src={value}
              alt="Logo preview"
              className="max-h-full transition-transform duration-200"
              style={{
                transform: `scale(${scale})`,
                objectFit,
                maxWidth: "100%",
              }}
              onError={() => toast.error("Failed to load logo image")}
            />
          </div>

          {/* Size variants preview */}
          <div className="flex items-end gap-3 mt-3 pt-2 border-t border-white/[0.06]">
            <div className="text-center">
              <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden mx-auto">
                <img src={value} alt="" className="h-7 w-7 object-contain" />
              </div>
              <span className={`text-[9px] ${textMuted} mt-1 block`}>Favicon</span>
            </div>
            <div className="text-center">
              <div className="h-8 w-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden mx-auto">
                <img src={value} alt="" className="h-5 w-5 object-contain" />
              </div>
              <span className={`text-[9px] ${textMuted} mt-1 block`}>Avatar</span>
            </div>
            <div className="text-center">
              <div className="h-8 w-20 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden mx-auto">
                <img src={value} alt="" className="h-5 object-contain" />
              </div>
              <span className={`text-[9px] ${textMuted} mt-1 block`}>Header</span>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden mx-auto">
                <img src={value} alt="" className="h-9 w-9 object-contain" />
              </div>
              <span className={`text-[9px] ${textMuted} mt-1 block`}>App Icon</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
