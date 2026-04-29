import { useNavigate } from "react-router-dom";
import { GraduationCap, Lock, ArrowRight, Vault } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PracticeRecordingVaultPage } from "@/components/training/PracticeRecordingVaultPage";

interface TrackCardProps {
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant?: "default" | "secondary";
  disabled?: boolean;
  onOpen?: () => void;
  delay?: number;
}

function TrackCard({ title, subtitle, badge, badgeVariant = "default", disabled, onOpen, delay = 0 }: TrackCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="card-widget relative overflow-hidden group"
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, hsla(211,96%,60%,.18), transparent 60%)",
        }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "hsla(211,96%,60%,.18)",
              boxShadow:
                "0 0 24px -6px hsla(211,96%,60%,.4), inset 0 0 0 1px hsla(211,96%,60%,.18)",
            }}
          >
            {disabled ? (
              <Lock className="h-5 w-5 text-[hsl(var(--nl-neon))]/70" />
            ) : (
              <GraduationCap className="h-5 w-5 text-[hsl(var(--nl-neon))] drop-shadow-[0_0_6px_hsla(211,96%,60%,.6)]" />
            )}
          </div>
          <Badge variant={badgeVariant} className="font-medium">
            {badge}
          </Badge>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{subtitle}</p>
        <Button
          onClick={onOpen}
          disabled={disabled}
          className="w-full group-hover:translate-x-0.5 transition-transform"
        >
          {disabled ? "Coming Soon" : "Open Track"}
          {!disabled && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </motion.div>
  );
}

export default function AdminTrainingCenter() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Center"
        description="Build and manage BDR and SDR training tracks"
      />

      <Tabs defaultValue="tracks" className="space-y-5">
        <TabsList className="bg-background/50">
          <TabsTrigger value="tracks" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Tracks
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2">
            <Vault className="h-4 w-4" /> Recording Vault
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
            <TrackCard
              title="BDR Training Track"
              subtitle="Business Development Rep Certification"
              badge="10 Modules"
              onOpen={() => navigate("/admin/training-center/bdr")}
              delay={0}
            />
            <TrackCard
              title="SDR Training Track"
              subtitle="Sales Development Rep Certification"
              badge="Coming Soon"
              badgeVariant="secondary"
              disabled
              delay={0.08}
            />
          </div>
        </TabsContent>

        <TabsContent value="vault" className="mt-0">
          <PracticeRecordingVaultPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
