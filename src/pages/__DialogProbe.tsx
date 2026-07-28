import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const LONG = "PHASE 0 — SETUP\n".repeat(3) + "https://adviserinfo.sec.gov/search/genericsearch/grid?verylongurlparameterthatcannotwrapeasily=1234567890";

export default function DialogProbe() {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-2xl max-h-[85dvh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="text-left pr-8">
          <DialogTitle>In-Person Street Sweep Guide</DialogTitle>
          <DialogDescription>Turn any street into an ordered, research-backed lead list.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 min-w-0">
          <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[11px] font-mono">{LONG}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
