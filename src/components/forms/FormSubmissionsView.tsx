import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ClipboardList } from "lucide-react";

interface Props {
  submissions: any[];
  forms: any[];
}

export function FormSubmissionsView({ submissions, forms }: Props) {
  const formNameMap = Object.fromEntries(forms.map((f) => [f.id, f.form_name]));

  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-semibold mb-1">No Submissions Yet</h3>
        <p className="text-xs text-muted-foreground">Submissions will appear here once customers submit your forms.</p>
      </div>
    );
  }

  return (
    <DataCard title="Recent Submissions">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Form</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Data Preview</th>
              <th className="text-right text-xs font-medium text-muted-foreground py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => {
              const data = typeof s.submission_data === "string" ? JSON.parse(s.submission_data) : s.submission_data;
              const preview = Object.entries(data || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ");
              return (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="text-sm font-medium py-3 pr-4">
                    <Badge variant="outline" className="text-[10px]">{formNameMap[s.form_id] || "Unknown"}</Badge>
                  </td>
                  <td className="text-xs text-muted-foreground py-3 pr-4 max-w-[300px] truncate">{preview || "—"}</td>
                  <td className="text-xs text-muted-foreground text-right py-3">
                    {s.submitted_at ? format(new Date(s.submitted_at), "MMM d, h:mm a") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataCard>
  );
}
