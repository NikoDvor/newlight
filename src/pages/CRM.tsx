import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Users, Building2, DollarSign, Mail, Phone, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const contacts = [
  { name: "Sarah Johnson", company: "TechCorp Inc.", email: "sarah@techcorp.com", phone: "(555) 123-4567", status: "Qualified", value: "$24,000", tags: ["Enterprise", "Q2"] },
  { name: "Mike Chen", company: "GrowthLab", email: "mike@growthlab.io", phone: "(555) 234-5678", status: "New Lead", value: "$8,500", tags: ["SMB"] },
  { name: "Lisa Park", company: "Bloom Agency", email: "lisa@bloom.co", phone: "(555) 345-6789", status: "Proposal Sent", value: "$36,000", tags: ["Agency", "Priority"] },
  { name: "David Smith", company: "RetailMax", email: "david@retailmax.com", phone: "(555) 456-7890", status: "Negotiation", value: "$52,000", tags: ["Enterprise", "Q1"] },
  { name: "Emma Wilson", company: "Startup Labs", email: "emma@startuplabs.io", phone: "(555) 567-8901", status: "Qualified", value: "$12,000", tags: ["Startup"] },
];

const pipelineStages = [
  { stage: "New Leads", count: 24, value: "$48,000" },
  { stage: "Qualified", count: 18, value: "$126,000" },
  { stage: "Proposal Sent", count: 8, value: "$84,000" },
  { stage: "Negotiation", count: 5, value: "$165,000" },
  { stage: "Closed Won", count: 12, value: "$210,000" },
];

export default function CRM() {
  return (
    <div>
      <PageHeader title="CRM" description="Manage contacts, deals, and your sales pipeline" />

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Contacts" value="156" change="+12 this month" changeType="positive" icon={Users} />
        <MetricCard label="Companies" value="42" change="+3 this week" changeType="positive" icon={Building2} />
        <MetricCard label="Pipeline Value" value="$633K" change="+18.2% vs last month" changeType="positive" icon={DollarSign} />
        <MetricCard label="Deals Won" value="12" change="$210,000 closed" changeType="positive" icon={DollarSign} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="pipeline" className="rounded-md text-sm">Pipeline</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-md text-sm">Contacts</TabsTrigger>
            <TabsTrigger value="deals" className="rounded-md text-sm">Deals</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <DataCard title="Revenue Pipeline">
              <div className="grid grid-cols-5 gap-3">
                {pipelineStages.map((s) => (
                  <div key={s.stage} className="bg-secondary rounded-xl p-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{s.stage}</p>
                    <p className="text-2xl font-semibold mt-2 tabular-nums">{s.count}</p>
                    <p className="text-xs text-muted-foreground mt-1 tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <DataCard title="Contacts">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Company</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Email</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.email} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="py-3 pr-4">
                          <p className="text-sm font-medium">{c.name}</p>
                          <div className="flex gap-1 mt-1">
                            {c.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="text-sm py-3 pr-4">{c.company}</td>
                        <td className="text-sm text-muted-foreground py-3 pr-4">{c.email}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                            c.status === "New Lead" ? "bg-blue-50 text-blue-600" :
                            c.status === "Qualified" ? "bg-emerald-50 text-emerald-600" :
                            c.status === "Proposal Sent" ? "bg-amber-50 text-amber-600" :
                            "bg-purple-50 text-purple-600"
                          }`}>{c.status}</span>
                        </td>
                        <td className="text-sm font-medium text-right py-3 tabular-nums">{c.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataCard>
          </TabsContent>

          <TabsContent value="deals" className="mt-4">
            <DataCard title="Active Deals">
              <div className="space-y-3">
                {contacts.filter(c => c.status !== "New Lead").map((c) => (
                  <div key={c.email} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.name} — {c.company}</p>
                      <p className="text-xs text-muted-foreground">{c.status}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{c.value}</p>
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
