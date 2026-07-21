import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActionCard({ name, badge, description, icon: Icon, to }: {
  name: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-2 py-0.5 mb-2">
            {badge}
          </span>
          <p className="text-sm font-semibold text-foreground">{name}</p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 mb-3 flex-1">{description}</p>
      <Button asChild size="sm" variant="outline" className="w-full gap-2">
        <Link to={to}>Open <ArrowRight className="h-3.5 w-3.5" /></Link>
      </Button>
    </Card>
  );
}
