import { useState, useCallback } from "react";
import { IndustryCategorySelect } from "./IndustryCategorySelect";
import { ArchetypeSelector } from "./ArchetypeSelector";
import { ZoomTierSelector } from "./ZoomTierSelector";
import { NicheSelect } from "./NicheSelect";
import {
  buildWorkspaceProfile,
  DEFAULT_WORKSPACE_PROFILE,
  type IndustryCategory,
  type BusinessArchetype,
  type ZoomTier,
  type WorkspaceProfile,
  type NicheMetadata,
} from "@/lib/workspaceProfileTypes";
import type { NicheDefinition } from "@/lib/workspaceNiches";
import { Cpu } from "lucide-react";

interface WorkspaceProfileBuilderProps {
  initialProfile?: Partial<WorkspaceProfile>;
  onChange?: (profile: WorkspaceProfile) => void;
  disabled?: boolean;
}

export function WorkspaceProfileBuilder({
  initialProfile,
  onChange,
  disabled = false,
}: WorkspaceProfileBuilderProps) {
  const [industry, setIndustry] = useState<IndustryCategory>(
    initialProfile?.industry ?? DEFAULT_WORKSPACE_PROFILE.industry
  );
  const [nicheId, setNicheId] = useState<string | null>(initialProfile?.niche ?? null);
  const [nicheMetadata, setNicheMetadata] = useState<NicheMetadata | null>(
    initialProfile?.metadata ?? null
  );
  const [archetype, setArchetype] = useState<BusinessArchetype>(
    initialProfile?.archetype ?? DEFAULT_WORKSPACE_PROFILE.archetype
  );
  const [zoomTier, setZoomTier] = useState<ZoomTier>(
    initialProfile?.zoomTier ?? DEFAULT_WORKSPACE_PROFILE.zoomTier
  );

  const emit = useCallback(
    (i: IndustryCategory, a: BusinessArchetype, z: ZoomTier, nId: string | null, nMeta: NicheMetadata | null) => {
      onChange?.(buildWorkspaceProfile(i, a, z, nId, nMeta));
    },
    [onChange]
  );

  const handleIndustry = (v: IndustryCategory) => {
    setIndustry(v);
    // Clear niche when industry changes
    setNicheId(null);
    setNicheMetadata(null);
    emit(v, archetype, zoomTier, null, null);
  };

  const handleNiche = (n: NicheDefinition) => {
    setNicheId(n.id);
    const meta: NicheMetadata = {
      revenueModel: n.revenueModel,
      salesCycle: n.salesCycle,
      ticketSize: n.ticketSize,
      complexityLevel: n.complexityLevel,
      complianceLevel: n.complianceLevel,
    };
    setNicheMetadata(meta);
    // Auto-sync archetype + zoom tier from niche (user can still override)
    setArchetype(n.archetype);
    setZoomTier(n.defaultZoomTier);
    emit(industry, n.archetype, n.defaultZoomTier, n.id, meta);
  };

  const handleArchetype = (v: BusinessArchetype) => {
    setArchetype(v);
    emit(industry, v, zoomTier, nicheId, nicheMetadata);
  };

  const handleZoom = (v: ZoomTier) => {
    setZoomTier(v);
    emit(industry, archetype, v, nicheId, nicheMetadata);
  };

  return (
    <div className={`space-y-6 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[hsl(var(--nl-electric))]/15 flex items-center justify-center">
          <Cpu className="h-4 w-4 text-[hsl(var(--nl-electric))]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Workspace Profile</h3>
          <p className="text-[11px] text-white/40">
            Define the business model to tailor modules, metrics, and automations.
          </p>
        </div>
      </div>

      <IndustryCategorySelect value={industry} onChange={handleIndustry} />
      <NicheSelect industry={industry} value={nicheId} onChange={handleNiche} />
      <ArchetypeSelector value={archetype} onChange={handleArchetype} />
      <ZoomTierSelector value={zoomTier} onChange={handleZoom} />
    </div>
  );
}
