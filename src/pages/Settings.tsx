import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { ClientBrandingSettings } from "@/components/ClientBrandingSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const teamMembers = [
  { name: "Alex Johnson", role: "Account Manager", email: "alex@newlight.com" },
  { name: "Sarah Williams", role: "Marketing Strategist", email: "sarah@newlight.com" },
  { name: "Mike Chen", role: "Ad Specialist", email: "mike@newlight.com" },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="space-y-6">
        <DataCard title="Company Information">
          <div className="space-y-4">
            <div>
              <Label htmlFor="company" className="text-sm font-medium">Company Name</Label>
              <Input id="company" defaultValue="Acme Marketing Co." className="mt-1.5 h-11 rounded-lg" />
            </div>
            <div>
              <Label htmlFor="logo" className="text-sm font-medium">Brand Logo</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center">
                  <span className="text-lg font-semibold text-muted-foreground">A</span>
                </div>
                <Button variant="secondary" size="sm" className="h-10 px-5 rounded-lg">Upload Logo</Button>
              </div>
            </div>
          </div>
        </DataCard>

        <DataCard title="Team Members">
          <div className="space-y-3">
            {teamMembers.map((m) => (
              <div key={m.email} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.role} · {m.email}</p>
                </div>
                <Button variant="secondary" size="sm" className="h-8 px-3 rounded-md text-xs">Edit</Button>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Notification Preferences">
          <div className="space-y-4">
            {[
              { label: "Email notifications", desc: "Receive updates via email" },
              { label: "Weekly reports", desc: "Get weekly performance summaries" },
              { label: "Meeting reminders", desc: "Get notified before meetings" },
              { label: "New review alerts", desc: "Get notified when new reviews are posted" },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
