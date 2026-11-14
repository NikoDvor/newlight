import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { SlideBody, toSlides } from "@/components/academy/ContentBlocks";

type Which = "gatekeeper" | "owner" | "full";
const TABS: { key: Which; label: string }[] = [
  { key: "gatekeeper", label: "Gatekeeper" },
  { key: "owner", label: "Owner" },
  { key: "full", label: "Full BDR script" },
];

const norm = (c: string) => c.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

/** Pull one "## Heading" section out of the chapter (heading line dropped; the tab name replaces it). */
function section(content: string, which: "gatekeeper" | "owner"): string {
  const parts = norm(content).split(/\n(?=## )/);
  const hit = parts.find((p) => new RegExp(`^##\\s*${which}\\b`, "i").test(p.trim()));
  if (!hit) return "";
  return hit.trim().replace(/^##[^\n]*\n/, "").replace(/\n\s*---+\s*$/, "").trim();
}

/** One Script button with a toggle: Gatekeeper / Owner / Full BDR script. Read live from the training chapter. */
export default function CallScript() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Which>("gatekeeper");
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

  const slides = !content ? [] : tab === "full" ? toSlides(content) : [section(content, tab)].filter(Boolean);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-white/80">
        <ScrollText className="h-4 w-4 mr-1" /> Script
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Call script</SheetTitle></SheetHeader>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-white/[0.06] p-1">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${tab === t.key ? "bg-[hsl(211,96%,56%)] text-white" : "text-white/60 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-5">
            {err && <p className="text-sm text-white/60">Couldn't load the script. Open it from Training → The Sales System → BDR Script.</p>}
            {!content && !err && <p className="text-sm text-white/50">Loading…</p>}
            {content && slides.length === 0 && <p className="text-sm text-white/60">This section wasn't found in the BDR Script chapter.</p>}
            {slides.map((s, i) => (
              <div key={tab + i} className={i ? "border-t border-white/10 pt-4" : ""}><SlideBody slide={s} /></div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
