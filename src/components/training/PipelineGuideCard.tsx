import { Link } from "react-router-dom";
import { ArrowRight, Route } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PipelineGuideCard({ to }: { to: string }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <Route className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
      <h2 className="flex-1 text-lg font-semibold text-foreground min-w-0">
        Pipeline Guide — how a lead moves from scrape to activated client
      </h2>
      <Button asChild className="shrink-0">
        <Link to={to}>Open Guide <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>
  );
}