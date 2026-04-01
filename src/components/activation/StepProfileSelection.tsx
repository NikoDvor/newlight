import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Zap, Settings2 } from "lucide-react";
import { PROFILE_TYPES, getProfilePack, applyProfileToWorkspace, type ProfileType } from "@/lib/profileEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StepProfileSelectionProps {
  form: any;
  set: (key: string, value: any) => void;
  clientId: string;
}

export function StepProfileSelection({ form, set, clientId }: StepProfileSelectionProps) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [result, setResult] = useState<any>(null);

  const selectedProfile = (form.selected_profile || form.provisional_profile || "custom_hybrid") as ProfileType;
  const zoomEnabled = form.zoom_enabled_final !== undefined ? form.zoom_enabled_final === true || form.zoom_enabled_final === "true" : getProfilePack(selectedProfile).zoom_enabled;
  const pack = getProfilePack(selectedProfile);

  const handleSelectProfile = (value: string) => {
    set("selected_profile", value);
    const pt = PROFILE_TYPES.find(p => p.value === value);
    if (pt) set("zoom_enabled_final", pt.zoomDefault);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const res = await applyProfileToWorkspace({
        clientId,
        profileType: selectedProfile,
        zoomEnabled: !!zoomEnabled,
        appliedBy: user.user?.id,
      });
      setResult(res);
      setApplied(true);
      set("profile_applied", "true");
      set("profile_applied_at", new Date().toISOString());
      toast.success(`Profile "${selectedProfile}" applied — ${res.calendarsCreated} calendars, ${res.formsCreated} forms created`);
    } catch (e: any) {
      toast.error(e.message || "Failed to apply profile");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Automation Profile</h3>
        <p className="text-xs text-white/50">
          Select the workspace profile that best matches this client's business model. This will provision calendars, forms, reminders, and module settings.
        </p>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PROFILE_TYPES.map(pt => (
          <button
            key={pt.value}
            onClick={() => handleSelectProfile(pt.value)}
            disabled={applied}
            className={`text-left rounded-xl p-3 border transition-all ${
              selectedProfile === pt.value
                ? "border-[hsl(var(--nl-electric))] bg-[hsl(var(--nl-electric))]/10"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            } ${applied ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-white">{pt.label}</span>
              {selectedProfile === pt.value && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--nl-electric))] shrink-0" />}
            </div>
            <p className="text-[11px] text-white/40 mt-1">{pt.description}</p>
            <div className="flex gap-1 mt-2">
              <Badge className="text-[9px] bg-white/10 text-white/50 border-0">
                Zoom: {pt.zoomDefault ? "ON" : "OFF"}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {/* Overrides */}
      <Card className="border-0 bg-white/[0.03]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="h-4 w-4 text-white/40" />
            <span className="text-sm font-medium text-white">Overrides</span>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Zoom / Meeting Intelligence</Label>
            <Switch
              checked={!!zoomEnabled}
              onCheckedChange={(v) => set("zoom_enabled_final", v)}
              disabled={applied}
            />
          </div>

          {/* Pack preview */}
          {selectedProfile !== "custom_hybrid" && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Will Provision</p>
              {pack.calendars.length > 0 && (
                <div className="text-[11px] text-white/50">
                  <span className="text-white/30">Calendars:</span>{" "}
                  {pack.calendars.map(c => c.calendar_name).join(", ")}
                </div>
              )}
              {pack.forms.length > 0 && (
                <div className="text-[11px] text-white/50">
                  <span className="text-white/30">Forms:</span>{" "}
                  {pack.forms.map(f => f.form_name).join(", ")}
                </div>
              )}
              {pack.reminders.length > 0 && (
                <div className="text-[11px] text-white/50">
                  <span className="text-white/30">Reminders:</span>{" "}
                  {pack.reminders.map(r => `${r.channel} ${r.offset_minutes >= 1440 ? `${r.offset_minutes / 1440}d` : `${r.offset_minutes}m`} before`).join(", ")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Button */}
      <Button
        onClick={handleApply}
        disabled={applying || applied}
        className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white"
      >
        {applying ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying Profile…</>
        ) : applied ? (
          <><CheckCircle2 className="h-4 w-4 mr-2" /> Profile Applied</>
        ) : (
          <><Zap className="h-4 w-4 mr-2" /> Apply Profile to Workspace</>
        )}
      </Button>

      {/* Result Summary */}
      {result && (
        <Card className="border-0 bg-emerald-500/5" style={{ borderColor: "hsla(152,60%,44%,.15)" }}>
          <CardContent className="p-3 space-y-1">
            <p className="text-xs font-medium text-emerald-400">Profile Applied Successfully</p>
            <div className="text-[11px] text-white/50 space-y-0.5">
              <p>Calendars created: {result.calendarsCreated}</p>
              <p>Appointment types created: {result.appointmentTypesCreated}</p>
              <p>Forms created: {result.formsCreated}</p>
              <p>Reminders created: {result.remindersCreated}</p>
              {result.skipped.length > 0 && (
                <p className="text-white/30">Skipped: {result.skipped.join(", ")}</p>
              )}
              {result.errors.length > 0 && (
                <p className="text-red-400">Errors: {result.errors.join(", ")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
