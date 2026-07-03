import { motion } from "framer-motion";
import { AlertCircle, Building } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { BackArrow } from "@/components/BackArrow";
import type { ResolvedClientState } from "@/hooks/useResolvedClientId";

interface Props {
  hook: ResolvedClientState;
  /** Page-specific title copy */
  title: string;
  /** Page-specific PageHeader description */
  description?: string;
  /** Bold headline inside the empty card */
  emptyTitle: string;
  /** Body shown to admins/operators */
  emptyBodyAdmin: string;
  /** Body shown to non-admins with no workspace */
  emptyBodyClient: string;
  backTo?: string;
  backLabel?: string;
}

/**
 * Shared "no workspace resolved" empty state used by admin-facing pages.
 * The resolution logic lives in `useResolvedClientId`; each page supplies
 * its own copy so context stays specific.
 */
export function ResolvedClientEmpty({
  hook,
  title,
  description,
  emptyTitle,
  emptyBodyAdmin,
  emptyBodyClient,
  backTo,
  backLabel,
}: Props) {
  const { isAdmin, adminClients, loadingClients, selectClient } = hook;

  return (
    <div className="max-w-2xl">
      {backTo && backLabel && <BackArrow to={backTo} label={backLabel} />}
      <PageHeader title={title} description={description} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-widget flex flex-col items-center text-center gap-4 py-10"
      >
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-primary/10">
          <AlertCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            {isAdmin ? emptyBodyAdmin : emptyBodyClient}
          </p>
        </div>

        {isAdmin && (
          <div className="w-full max-w-sm mt-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block text-left">
              <Building className="h-3 w-3 inline mr-1" /> Client workspace
            </label>
            <select
              className="w-full h-10 rounded-lg border border-border bg-secondary/50 text-xs px-3"
              defaultValue=""
              disabled={loadingClients}
              onChange={(e) => selectClient(e.target.value)}
            >
              <option value="" disabled>
                {loadingClients
                  ? "Loading workspaces…"
                  : `Select a workspace (${adminClients.length})`}
              </option>
              {adminClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name || c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.div>
    </div>
  );
}
