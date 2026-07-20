import { useState } from "react";
import {
  Copy,
  Check,
  MoreHorizontal,
  ExternalLink,
  Edit3,
  Copy as Duplicate,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

export interface BookingLinkCardAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
}

interface BookingLinkCardProps {
  name: string;
  /** Optional right-side label (e.g. "Primary", "Meeting 2"). */
  badge?: string;
  url: string;
  active?: boolean;
  onToggleActive?: (next: boolean) => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Extra items appended to the ⋯ menu. */
  extraActions?: BookingLinkCardAction[];
}

/**
 * Booking-link card matching the redesign spec:
 * - Prominent "Copy link" primary action
 * - Inline active/paused toggle
 * - ⋯ overflow menu (Open / Edit / Duplicate / Delete)
 * All colors use design tokens; no hardcoded palette.
 */
export function BookingLinkCard({
  name,
  badge,
  url,
  active,
  onToggleActive,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  extraActions,
}: BookingLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const disabled = !url;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const openDefault =
    onOpen ??
    (() => {
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });

  return (
    <div className="rounded-xl border border-border bg-card/70 p-3 space-y-3 focus-within:ring-2 focus-within:ring-ring">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-foreground flex-1 truncate">
          {name}
          {badge && (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-primary/80">
              {badge}
            </span>
          )}
        </div>
        {onToggleActive && (
          <label
            className="flex items-center gap-1.5 cursor-pointer text-[11px]"
            title={active ? "Active" : "Paused"}
          >
            <span className="text-muted-foreground">
              {active ? "Active" : "Paused"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!active}
              aria-label={active ? "Pause booking link" : "Activate booking link"}
              onClick={() => onToggleActive(!active)}
              className={
                "h-5 w-9 rounded-full transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                (active ? "bg-primary" : "bg-muted")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform " +
                  (active ? "translate-x-4" : "translate-x-0.5")
                }
              />
            </button>
          </label>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="More actions"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={openDefault} disabled={disabled}>
              <ExternalLink className="h-4 w-4 mr-2" /> Open
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Duplicate className="h-4 w-4 mr-2" /> Duplicate
              </DropdownMenuItem>
            )}
            {extraActions?.map((a, i) => {
              const Icon = a.icon;
              return (
                <DropdownMenuItem
                  key={i}
                  onClick={a.onSelect}
                  className={a.destructive ? "text-destructive focus:text-destructive" : undefined}
                >
                  {Icon && <Icon className="h-4 w-4 mr-2" />}
                  {a.label}
                </DropdownMenuItem>
              );
            })}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* URL + primary Copy action */}
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 min-w-0">
        <div
          className="flex-1 min-w-0 max-w-full rounded-md bg-muted/40 border border-border px-3 py-2 font-mono text-xs text-foreground/80 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]"
          title={url || undefined}
        >
          <span className="block break-all">{url || "Not configured yet"}</span>
        </div>
        <Button
          type="button"
          onClick={copy}
          disabled={disabled}
          aria-label="Copy booking link"
          className="w-full sm:w-auto sm:min-w-[92px] min-h-11 shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1.5" /> Copy link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
