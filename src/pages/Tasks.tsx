import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { CheckSquare, Clock, User, AlertTriangle } from "lucide-react";

const tasks = [
  { title: "Review Q2 campaign creative", assignee: "Sarah W.", priority: "High", due: "Mar 13", status: "Open" },
  { title: "Approve social media calendar", assignee: "You", priority: "Medium", due: "Mar 14", status: "Open" },
  { title: "Provide feedback on landing page", assignee: "You", priority: "High", due: "Mar 15", status: "Open" },
  { title: "Review monthly report", assignee: "Alex J.", priority: "Low", due: "Mar 16", status: "Open" },
  { title: "Update brand guidelines doc", assignee: "Mike C.", priority: "Medium", due: "Mar 10", status: "Completed" },
  { title: "Approve ad copy for Google", assignee: "You", priority: "High", due: "Mar 8", status: "Completed" },
  { title: "Review competitor analysis", assignee: "Sarah W.", priority: "Low", due: "Mar 7", status: "Completed" },
];

export default function Tasks() {
  const open = tasks.filter(t => t.status === "Open");
  const completed = tasks.filter(t => t.status === "Completed");

  return (
    <div>
      <PageHeader title="Tasks" description="Manage and track your marketing tasks" />

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Open Tasks" value={String(open.length)} change="2 due today" changeType="neutral" icon={CheckSquare} />
        <MetricCard label="Completed" value={String(completed.length)} change="This month" changeType="positive" icon={Clock} />
        <MetricCard label="Assigned to You" value="3" change="1 high priority" changeType="neutral" icon={User} />
        <MetricCard label="Priority Tasks" value="3" change="High priority" changeType="neutral" icon={AlertTriangle} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Open Tasks">
          <div className="space-y-3">
            {open.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-1.5 h-3 w-3 rounded border-2 border-border shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.assignee} · Due: {t.due}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-md shrink-0 ml-3 ${
                  t.priority === "High" ? "bg-red-50 text-red-600" :
                  t.priority === "Medium" ? "bg-amber-50 text-amber-600" :
                  "bg-secondary text-muted-foreground"
                }`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Completed Tasks">
          <div className="space-y-3">
            {completed.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-1.5 h-3 w-3 rounded bg-emerald-500 shrink-0 flex items-center justify-center">
                    <CheckSquare className="h-2 w-2 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground line-through">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.assignee} · {t.due}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
