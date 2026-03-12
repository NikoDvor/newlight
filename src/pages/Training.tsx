import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { LockedFeature } from "@/components/LockedFeature";
import { GraduationCap, BookOpen, Trophy, Video } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

const courses = [
  { title: "Marketing Fundamentals", lessons: 12, duration: "2h 30m", progress: 100, status: "Completed" },
  { title: "Social Media Mastery", lessons: 8, duration: "1h 45m", progress: 62, status: "In Progress" },
  { title: "SEO Best Practices", lessons: 10, duration: "2h 15m", progress: 0, status: "Not Started" },
  { title: "Paid Advertising 101", lessons: 15, duration: "3h", progress: 0, status: "Not Started" },
];

export default function Training() {
  return (
    <div>
      <PageHeader title="Training" description="Courses, videos, and certifications to grow your skills" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Courses Available" value="12" change="4 new this month" changeType="positive" icon={BookOpen} />
        <MetricCard label="Training Videos" value="48" change="Updated weekly" changeType="neutral" icon={Video} />
        <MetricCard label="Quizzes Passed" value="3" change="Out of 8 total" changeType="neutral" icon={GraduationCap} />
        <MetricCard label="Certifications" value="1" change="Marketing Fundamentals" changeType="positive" icon={Trophy} />
      </WidgetGrid>

      <DataCard title="Available Courses" className="mt-6">
        <div className="space-y-4">
          {courses.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-4 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.lessons} lessons · {c.duration}</p>
                {c.progress > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex-1 max-w-[200px]">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${c.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{c.progress}%</span>
                  </div>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-md ml-4 ${
                c.status === "Completed" ? "bg-emerald-50 text-emerald-600" :
                c.status === "In Progress" ? "bg-accent/10 text-accent" :
                "bg-secondary text-muted-foreground"
              }`}>{c.status}</span>
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
