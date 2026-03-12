import { STATUS_COLORS, type WorkflowStatus } from "@/lib/salesData";

export function StatusChip({ status }: { status: WorkflowStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}
