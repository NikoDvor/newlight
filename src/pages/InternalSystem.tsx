import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import {
  BookOpen, ClipboardList, FileText, Activity, UserCog, Brain,
} from "lucide-react";

const sections = [
  { title: "SOPs", description: "Standard operating procedures", url: "/sops", icon: BookOpen },
  { title: "Workflows", description: "Internal process workflows", url: "/workflows", icon: ClipboardList },
  { title: "Brand Assets", description: "Logos, colors, and brand files", url: "/brand-assets", icon: FileText },
  { title: "Automations", description: "Trigger-based automated actions", url: "/automations", icon: Activity },
  { title: "Roles & Permissions", description: "Team access and roles", url: "/roles-permissions", icon: UserCog },
  { title: "Meeting Intelligence", description: "Call recordings and notes", url: "/meeting-intelligence", icon: Brain },
  { title: "Knowledge Base", description: "Internal docs and references", url: "/knowledge-base", icon: BookOpen },
];

export default function InternalSystem() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Internal System" description="Your team's operating backbone — SOPs, workflows, automations, and access controls." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.title}
            to={s.url}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 p-5 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <s.icon className="h-5 w-5 text-white/70 group-hover:text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-xs text-white/50 mt-1">{s.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
