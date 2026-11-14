import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toSlides, SlideBody } from "@/components/academy/ContentBlocks";

/** The BDR call script, read live from the training chapter so it never drifts from what reps were trained on. */
export default function CallScript() {
  const [open, setOpen] = useState(false);
  const [slides, setSlides] = useState<string[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!open || slides) return;
    (supabase as any).from("nl_training_chapters").select("content").eq("chapter_title", "BDR Script").limit(1).maybeSingle()
      .then(({ data, error }: any) => {
        if (error || !data?.content) { setErr(true); return; }
        setSlides(toSlides(String(data.content)));
      });
  }, [open, slides]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-white/80">
        <ScrollText className="h-4 w-4 mr-1" /> Script
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Call script</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-5">
            {err && <p className="text-sm text-white/60">Couldn't load the script. Open it from Training → The Sales System → BDR Script.</p>}
            {!slides && !err && <p className="text-sm text-white/50">Loading…</p>}
            {slides?.map((s, i) => (
              <div key={i} className={i ? "border-t border-white/10 pt-4" : ""}><SlideBody slide={s} /></div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
