import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Download, Image, Type, Zap, Monitor, Globe, Shield,
  Palette, Bell, Layout
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAppSettings() {
  const [appName, setAppName] = useState("NewLight");
  const [pwaEnabled, setPwaEnabled] = useState(true);
  const [splashEnabled, setSplashEnabled] = useState(true);
  const [mobileOptimized, setMobileOptimized] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [standaloneMode, setStandaloneMode] = useState(true);

  const handleSave = () => {
    toast.success("App settings saved");
  };

  return (
    <div>
      <PageHeader title="App Experience" description="Manage PWA settings, app branding, and mobile experience" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* App Identity */}
        <DataCard title="App Identity">
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-white/60 mb-1.5 block">App Display Name</Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="bg-white/[0.06] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.08)", border: "1px solid hsla(211,96%,60%,.12)" }}>
                <div className="h-12 w-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))" }}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <p className="text-[10px] text-white/50">App Icon</p>
                <Badge variant="outline" className="text-[9px] mt-1 border-white/10 text-white/40">192×192</Badge>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.08)", border: "1px solid hsla(211,96%,60%,.12)" }}>
                <div className="h-12 w-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))" }}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <p className="text-[10px] text-white/50">Large Icon</p>
                <Badge variant="outline" className="text-[9px] mt-1 border-white/10 text-white/40">512×512</Badge>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.08)", border: "1px solid hsla(211,96%,60%,.12)" }}>
                <div className="h-12 w-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))" }}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <p className="text-[10px] text-white/50">Splash Logo</p>
                <Badge variant="outline" className="text-[9px] mt-1 border-white/10 text-white/40">Active</Badge>
              </div>
            </div>
          </div>
        </DataCard>

        {/* PWA Settings */}
        <DataCard title="Installability & PWA">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.06)" }}>
              <div className="flex items-center gap-3">
                <Download className="h-4 w-4 text-white/50" />
                <div>
                  <p className="text-xs font-medium text-white/80">PWA Installable</p>
                  <p className="text-[10px] text-white/40">Users can install from browser</p>
                </div>
              </div>
              <Switch checked={pwaEnabled} onCheckedChange={setPwaEnabled} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.06)" }}>
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-white/50" />
                <div>
                  <p className="text-xs font-medium text-white/80">Standalone Mode</p>
                  <p className="text-[10px] text-white/40">Full-screen app experience</p>
                </div>
              </div>
              <Switch checked={standaloneMode} onCheckedChange={setStandaloneMode} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.06)" }}>
              <div className="flex items-center gap-3">
                <Image className="h-4 w-4 text-white/50" />
                <div>
                  <p className="text-xs font-medium text-white/80">Splash Screen</p>
                  <p className="text-[10px] text-white/40">Branded loading screen</p>
                </div>
              </div>
              <Switch checked={splashEnabled} onCheckedChange={setSplashEnabled} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.06)" }}>
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-white/50" />
                <div>
                  <p className="text-xs font-medium text-white/80">Push Notifications</p>
                  <p className="text-[10px] text-white/40">Coming soon</p>
                </div>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} disabled />
            </div>
          </div>
        </DataCard>

        {/* Mobile Experience */}
        <DataCard title="Mobile Experience">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.06)" }}>
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-white/50" />
                <div>
                  <p className="text-xs font-medium text-white/80">Mobile Optimized</p>
                  <p className="text-[10px] text-white/40">Touch-friendly navigation & layout</p>
                </div>
              </div>
              <Switch checked={mobileOptimized} onCheckedChange={setMobileOptimized} />
            </div>
            <div className="p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.06)" }}>
              <p className="text-xs font-medium text-white/80 mb-2">Status Bar</p>
              <div className="flex gap-2">
                {["default", "black", "black-translucent"].map((style) => (
                  <Badge key={style} variant={style === "black-translucent" ? "default" : "outline"}
                    className={style === "black-translucent" ? "text-[10px]" : "text-[10px] border-white/10 text-white/40"}>
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DataCard>

        {/* App Store Readiness */}
        <DataCard title="App Store Readiness">
          <div className="space-y-3">
            {[
              { label: "PWA Manifest", status: "ready", icon: Globe },
              { label: "App Icons (192×192, 512×512)", status: "ready", icon: Image },
              { label: "Splash Screen", status: "ready", icon: Layout },
              { label: "Standalone Display", status: "ready", icon: Monitor },
              { label: "Login-First Flow", status: "ready", icon: Shield },
              { label: "Touch-Optimized UI", status: "ready", icon: Smartphone },
              { label: "Capacitor Ready", status: "pending", icon: Zap },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-xs text-white/70">{item.label}</span>
                </div>
                <Badge variant={item.status === "ready" ? "default" : "outline"}
                  className={item.status === "ready"
                    ? "text-[10px] bg-emerald-500/20 text-emerald-400 border-0"
                    : "text-[10px] border-amber-500/20 text-amber-400"}>
                  {item.status === "ready" ? "✓ Ready" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} className="btn-gradient gap-2">
          Save App Settings
        </Button>
      </div>
    </div>
  );
}
