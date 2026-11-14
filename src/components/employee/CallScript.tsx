import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { SlideBody } from "@/components/academy/ContentBlocks";

type Which = "gatekeeper" | "owner";
const TITLE: Record<Which, string> = { gatekeeper: "Gatekeeper script", owner: "Owner script" };

/** Pull one "## Heading" section out of the chapter (heading line dropped; the sheet title replaces it). */
function section(content: string, which: Which): string {
  const text = content.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  const parts = text.split(/\n(?=## )/);
  const hit = parts.find((p) => new RegExp(`^##\\s*${which}\\b`, "i").test(p.trim()));
  if (!hit) return "";
  return hit.trim().replace(/^##[^\n]*\n/, "").replace(/\n\s*---+\s*$/, "").trim();
}

/** Gatekeeper / Owner scripts, read live from the BDR Script training chapter so they never drift from what reps were trained on. */
export default function CallScript() {
  const [open, setOpen] = useState<Which | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!open || content) return;
    (supabase as any).from("nl_training_chapters").select("content").eq("chapter_title", "BDR Script").limit(1).maybeSingle()
      .then(({ data, error }: any) => {
        if (error || !data?.content) { setErr(true); return; }
        setContent(String(data.content));
      });
  }, [open, content]);

  const body = open && content ? section(content, open) : "";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen("gatekeeper")} className="text-white/80">Gatekeeper script</Button>
      <Button variant="outline" size="sm" onClick={() => setOpen("owner")} className="text-white/80">Owner script</Button>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{open ? TITLE[open] : ""}</SheetTitle></SheetHeader>
          <div className="mt-4">
            {err && <p className="text-sm text-white/60">Couldn't load the script. Open it from Training → The Sales System → BDR Script.</p>}
            {!content && !err && <p className="text-sm text-white/50">Loading…</p>}
            {content && !body && <p className="text-sm text-white/60">This section wasn't found in the BDR Script chapter.</p>}
            {body && <SlideBody slide={body} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
