import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DiscoveryNumbersPanel from "@/components/pipeline/DiscoveryNumbersPanel";

/**
 * Full-screen wrapper for the Discovery Numbers panel — built to screen-share
 * on the discovery call (nothing internal on screen: no prices, notes or
 * other leads). Entries save to the lead as you type.
 */
export default function DiscoveryNumbersDialog({
  lead, eventId, onClose,
}: { lead: { id: string; business_name?: string | null } | null; eventId?: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] max-h-[94dvh] overflow-y-auto bg-[hsl(222,42%,6%)] border-white/10 text-white p-3 sm:p-5">
        <DialogHeader className="sr-only">
          <DialogTitle>Discovery numbers</DialogTitle>
          <DialogDescription>The prospect's goal, where they are now, and the missed revenue opportunity.</DialogDescription>
        </DialogHeader>
        {lead && <DiscoveryNumbersPanel leadId={lead.id} eventId={eventId} businessName={lead.business_name} />}
      </DialogContent>
    </Dialog>
  );
}
