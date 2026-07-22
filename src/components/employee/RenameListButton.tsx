import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  listName: string;
  existingLists: string[]; // all current list_name values for this user (excluding null/Unsorted)
  onRenamed: (oldName: string, newName: string) => void;
  size?: number;
  className?: string;
}

const RESERVED_AUTO_LIST = "Booking Form";

export default function RenameListButton({ listName, existingLists, onRenamed, size = 12, className }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(listName);
  const [saving, setSaving] = useState(false);
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [ackAutoList, setAckAutoList] = useState(false);

  const openDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(listName);
    setConfirmMerge(false);
    setAckAutoList(false);
    setOpen(true);
  };

  const submit = async () => {
    const clean = value.trim();
    if (!clean) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (clean === listName) { setOpen(false); return; }

    const collides = existingLists.some(n => n !== listName && n.toLowerCase() === clean.toLowerCase());
    if (collides && !confirmMerge) { setConfirmMerge(true); return; }

    if (listName === RESERVED_AUTO_LIST && !ackAutoList) { setAckAutoList(true); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("nl_bdr_leads")
        .update({ list_name: clean })
        .eq("user_id", user.id)
        .eq("list_name", listName);
      if (error) throw error;
      onRenamed(listName, clean);
      toast({ title: collides ? `Merged into "${clean}"` : `Renamed to "${clean}"` });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Rename failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={openDialog}
        aria-label={`Rename list ${listName}`}
        className={className ?? "inline-flex items-center justify-center rounded-full p-1 hover:bg-white/10 transition-colors"}
      >
        <Pencil size={size} className="opacity-70" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename list</DialogTitle>
            <DialogDescription>
              Renames only your own leads currently in "{listName}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={value}
              onChange={(e) => { setValue(e.target.value); setConfirmMerge(false); }}
              placeholder="New list name"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />

            {confirmMerge && (
              <div className="rounded-md p-2 text-xs" style={{ background: "hsla(38,92%,50%,.10)", color: "hsl(38,92%,72%)", border: "1px solid hsla(38,92%,50%,.30)" }}>
                A list named "{value.trim()}" already exists. This will merge "{listName}" into it — continue?
              </div>
            )}

            {listName === RESERVED_AUTO_LIST && ackAutoList && (
              <div className="rounded-md p-2 text-xs" style={{ background: "hsla(211,96%,56%,.10)", color: "hsl(211,96%,80%)", border: "1px solid hsla(211,96%,56%,.30)" }}>
                New leads booked through your calendar will keep creating a "Booking Form" list going forward — this renames only your existing leads.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              {confirmMerge ? "Merge" : (listName === RESERVED_AUTO_LIST && ackAutoList ? "Rename anyway" : "Rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
