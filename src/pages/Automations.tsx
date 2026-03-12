import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Workflow, Plus, Play, Pause, ArrowRight, Zap, Mail, MessageSquare,
  CheckSquare, GitBranch, Bell, GripVertical, Trash2, Star, Users
} from "lucide-react";
import { motion } from "framer-motion";

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition";
  label: string;
  icon: typeof Zap;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  status: "Active" | "Paused";
  runs: number;
  lastTriggered: string;
  nodes: WorkflowNode[];
}

const mockWorkflows: AutomationWorkflow[] = [
  {
    id: "w1", name: "New Lead Nurture", status: "Active", runs: 342, lastTriggered: "2 hours ago",
    nodes: [
      { id: "n1", type: "trigger", label: "Form Submitted", icon: Zap },
      { id: "n2", type: "action", label: "Send Welcome SMS", icon: MessageSquare },
      { id: "n3", type: "action", label: "Send Email Sequence", icon: Mail },
      { id: "n4", type: "action", label: "Create Follow-up Task", icon: CheckSquare },
      { id: "n5", type: "action", label: "Move to Contacted", icon: GitBranch },
    ],
  },
  {
    id: "w2", name: "Post-Service Review Request", status: "Active", runs: 156, lastTriggered: "5 hours ago",
    nodes: [
      { id: "n6", type: "trigger", label: "Appointment Completed", icon: Zap },
      { id: "n7", type: "action", label: "Wait 24 hours", icon: Pause },
      { id: "n8", type: "action", label: "Send Review Request SMS", icon: Star },
      { id: "n9", type: "action", label: "Send Follow-up Email", icon: Mail },
    ],
  },
  {
    id: "w3", name: "Pipeline Stage Alerts", status: "Paused", runs: 89, lastTriggered: "2 days ago",
    nodes: [
      { id: "n10", type: "trigger", label: "Pipeline Stage Changed", icon: Zap },
      { id: "n11", type: "condition", label: "If Stage = Won", icon: GitBranch },
      { id: "n12", type: "action", label: "Notify Team", icon: Bell },
      { id: "n13", type: "action", label: "Create Onboarding Task", icon: CheckSquare },
    ],
  },
];

const NODE_STYLE: Record<string, string> = {
  trigger: "bg-blue-50 border-blue-200 text-blue-700",
  action: "bg-emerald-50 border-emerald-200 text-emerald-700",
  condition: "bg-amber-50 border-amber-200 text-amber-700",
};

const triggerOptions = ["Form Submitted", "New Lead Created", "Pipeline Stage Changed", "Appointment Completed"];
const actionOptions = ["Send SMS", "Send Email", "Assign Task", "Move Pipeline Stage", "Send Review Request", "Notify Team"];

export default function Automations() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [builderNodes, setBuilderNodes] = useState<WorkflowNode[]>([
    { id: "b1", type: "trigger", label: "Form Submitted", icon: Zap },
  ]);

  const openBuilder = (wf?: AutomationWorkflow) => {
    if (wf) {
      setSelectedWorkflow(wf);
      setBuilderNodes([...wf.nodes]);
    } else {
      setSelectedWorkflow(null);
      setBuilderNodes([{ id: "b1", type: "trigger", label: "Form Submitted", icon: Zap }]);
    }
    setBuilderOpen(true);
  };

  const addNode = (type: "action" | "condition") => {
    setBuilderNodes((prev) => [
      ...prev,
      { id: `bn-${Date.now()}`, type, label: type === "action" ? "Send SMS" : "If condition met", icon: type === "action" ? MessageSquare : GitBranch },
    ]);
  };

  const removeNode = (id: string) => setBuilderNodes((prev) => prev.filter((n) => n.id !== id));

  return (
    <div>
      <PageHeader title="Automations" description="Build workflows to automate marketing tasks">
        <Button className="gap-1.5" onClick={() => openBuilder()}>
          <Plus className="h-4 w-4" /> New Workflow
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Workflows" value="3" change="2 active" changeType="positive" icon={Workflow} />
        <MetricCard label="Total Runs" value="587" change="This month" changeType="positive" icon={Play} />
        <MetricCard label="Emails Sent" value="1,240" change="Via automations" changeType="positive" icon={Mail} />
        <MetricCard label="Tasks Created" value="342" change="Auto-generated" changeType="positive" icon={CheckSquare} />
      </WidgetGrid>

      {/* Workflows list */}
      <div className="mt-8 space-y-4">
        {mockWorkflows.map((wf) => (
          <motion.div
            key={wf.id}
            className="card-widget p-5 rounded-2xl cursor-pointer card-widget-clickable"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => openBuilder(wf)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">{wf.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">{wf.runs} runs</span>
                  <span>Last: {wf.lastTriggered}</span>
                </div>
              </div>
              <Badge className={wf.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-secondary text-muted-foreground"}>
                {wf.status === "Active" ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                {wf.status}
              </Badge>
            </div>

            {/* Flow visualization */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {wf.nodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-2 shrink-0">
                  <div className={`rounded-xl border px-3 py-2 ${NODE_STYLE[node.type]}`}>
                    <p className="text-[11px] font-semibold">{node.label}</p>
                  </div>
                  {i < wf.nodes.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Workflow Builder Sheet */}
      <Sheet open={builderOpen} onOpenChange={setBuilderOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedWorkflow ? selectedWorkflow.name : "New Workflow"}</SheetTitle>
            <SheetDescription>Add triggers, actions, and conditions</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {builderNodes.map((node, i) => (
              <div key={node.id} className="flex items-center gap-3 group">
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${NODE_STYLE[node.type]}`}>
                    {i + 1}
                  </div>
                  {i < builderNodes.length - 1 && <div className="w-px h-4 bg-border" />}
                </div>
                <div className="flex-1 bg-secondary rounded-xl p-3 flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{node.type}</p>
                    <Select
                      value={node.label}
                      onValueChange={(v) => setBuilderNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, label: v } : n))}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1 border-0 bg-transparent p-0 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(node.type === "trigger" ? triggerOptions : actionOptions).map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {node.type !== "trigger" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeNode(node.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1 gap-1" onClick={() => addNode("action")}>
              <Plus className="h-3.5 w-3.5" /> Add Action
            </Button>
            <Button variant="outline" className="flex-1 gap-1" onClick={() => addNode("condition")}>
              <GitBranch className="h-3.5 w-3.5" /> Add Condition
            </Button>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            <Button className="flex-1">Save Workflow</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
