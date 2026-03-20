import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps, ServiceConfig } from "./activationTypes";
import { defaultServiceConfig } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
const selectCls = "w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3";

function ServiceCard({ svc, index, onChange, onRemove, canRemove, disabled }: {
  svc: ServiceConfig; index: number;
  onChange: (i: number, k: keyof ServiceConfig, v: string) => void;
  onRemove: (i: number) => void;
  canRemove: boolean; disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const set = (k: keyof ServiceConfig, v: string) => onChange(index, k, v);

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.10)" }}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-left flex-1">
          {expanded ? <ChevronUp className="h-3 w-3 text-white/30" /> : <ChevronDown className="h-3 w-3 text-white/30" />}
          <span className="text-xs font-semibold text-white/70">{svc.service_name || `Service ${index + 1}`}</span>
        </button>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} disabled={disabled} className="text-white/30 hover:text-red-400 p-1">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div><label className={labelCls}>Service Name *</label><Input value={svc.service_name} onChange={e => set("service_name", e.target.value)} placeholder="e.g. Consultation" className={inputCls} disabled={disabled} /></div>
          <div><label className={labelCls}>Display Price</label><Input value={svc.display_price_text} onChange={e => set("display_price_text", e.target.value)} placeholder="e.g. Starting at $99" className={inputCls} disabled={disabled} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Description</label><Textarea value={svc.service_description} onChange={e => set("service_description", e.target.value)} className={`${inputCls} min-h-[40px]`} disabled={disabled} /></div>
          <div><label className={labelCls}>Status</label>
            <select value={svc.service_status} onChange={e => set("service_status", e.target.value)} className={selectCls} disabled={disabled}>
              <option value="draft">Draft</option><option value="live">Live</option>
            </select>
          </div>
          <div><label className={labelCls}>Bookable?</label>
            <select value={svc.bookable} onChange={e => set("bookable", e.target.value)} className={selectCls} disabled={disabled}>
              <option value="no">No</option><option value="yes">Yes — link to calendar</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export function StepServices({ form, set, submitting }: StepProps) {
  const configs = form.service_configs || [defaultServiceConfig()];

  const setConfigs = (fn: (prev: ServiceConfig[]) => ServiceConfig[]) => {
    const next = fn(configs);
    set("service_configs", next as any);
  };

  const addService = () => setConfigs(prev => [...prev, defaultServiceConfig()]);
  const removeService = (i: number) => setConfigs(prev => prev.filter((_, idx) => idx !== i));
  const updateService = (i: number, k: keyof ServiceConfig, v: string) =>
    setConfigs(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  return (
    <div className="space-y-4">
      <ActivationHelp title="Services & Products" items={[
        "Creates service catalog entries visible on the client website and booking pages",
        "Services can be linked to calendars for direct booking",
        "All entries can be edited later in the Services & Products module",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="h-3 w-3" /> Service Catalog
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={addService} disabled={submitting}
            className="text-[hsl(var(--nl-sky))] hover:bg-white/10 text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add Service
          </Button>
        </div>
        <div className="space-y-2">
          {configs.map((svc, i) => (
            <ServiceCard key={i} svc={svc} index={i} onChange={updateService}
              onRemove={removeService} canRemove={configs.length > 1} disabled={submitting} />
          ))}
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Additional Notes</p>
        <Textarea value={form.services_notes || ""} onChange={e => set("services_notes", e.target.value)}
          placeholder="Any notes about services, pricing, or product setup…"
          className={`${inputCls} min-h-[50px]`} disabled={submitting} />
      </div>
    </div>
  );
}
