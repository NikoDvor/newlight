import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { EmptyModuleState } from "@/components/EmptyModuleState";
import { GraduationCap, BookOpen, Trophy, Video, Play, Clock, CheckCircle2 } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion } from "framer-motion";

const courses = [
  { title: "Getting Started with Your Workspace", lessons: 6, duration: "45m", progress: 0, status: "Not Started", category: "Onboarding" },
  { title: "Marketing Fundamentals", lessons: 12, duration: "2h 30m", progress: 0, status: "Not Started", category: "Marketing" },
  { title: "Social Media Mastery", lessons: 8, duration: "1h 45m", progress: 0, status: "Not Started", category: "Marketing" },
  { title: "SEO Best Practices", lessons: 10, duration: "2h 15m", progress: 0, status: "Not Started", category: "SEO" },
  { title: "Paid Advertising 101", lessons: 15, duration: "3h", progress: 0, status: "Not Started", category: "Ads" },
  { title: "CRM & Sales Pipeline Management", lessons: 8, duration: "1h 30m", progress: 0, status: "Not Started", category: "Sales" },
  { title: "Calendar & Booking System", lessons: 6, duration: "1h", progress: 0, status: "Not Started", category: "Operations" },
  { title: "Review Management & Reputation", lessons: 5, duration: "50m", progress: 0, status: "Not Started", category: "Reviews" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Onboarding: "bg-primary/10 text-primary",
  Marketing: "bg-violet-50 text-violet-700",
  SEO: "bg-emerald-50 text-emerald-700",
  Ads: "bg-amber-50 text-amber-700",
  Sales: "bg-blue-50 text-blue-700",
  Operations: "bg-cyan-50 text-cyan-700",
  Reviews: "bg-rose-50 text-rose-700",
};

export default function Training() {
  const { activeClientId } = useWorkspace();

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Training" description="Courses, videos, and certifications to grow your skills" />
        <EmptyModuleState
          icon={GraduationCap}
          title="Select a Workspace"
          description="Choose a workspace to access training courses and certification resources."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Training" description="Courses, videos, and certifications to grow your skills" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Courses Available" value={String(courses.length)} change="Self-paced" changeType="neutral" icon={BookOpen} />
        <MetricCard label="Estimated Time" value="13h+" change="Total learning" changeType="neutral" icon={Clock} />
        <MetricCard label="Categories" value="7" change="Topics covered" changeType="neutral" icon={GraduationCap} />
        <MetricCard label="Certifications" value="0" change="Complete courses to earn" changeType="neutral" icon={Trophy} />
      </WidgetGrid>

      <DataCard title="Available Courses" className="mt-6">
        <div className="space-y-1">
          {courses.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <Play className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{c.lessons} lessons · {c.duration}</span>
                    <Badge className={`text-[9px] h-4 ${CATEGORY_COLORS[c.category] || "bg-secondary text-muted-foreground"}`}>
                      {c.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 shrink-0">
                <Play className="h-3 w-3" /> Start
              </Button>
            </motion.div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
