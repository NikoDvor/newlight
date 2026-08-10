import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Loader2, CheckCircle2, Search, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";

interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  types: string[];
  primaryType: string | null;
}

const prettyType = (t: string | null) =>
  t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Business";

export default function StreetSweepDiscover() {
  const navigate = useNavigate();
  const { clientId } = useEmployeeClientId();

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<DiscoveredPlace[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<{ count: number; names: string[] } | null>(null);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const allSelected = !!results && results.length > 0 && selectedIds.length === results.length;

  const discover = async () => {
    if (!street.trim() || !city.trim() || !state.trim()) {
      toast.error("Street, city and state are required.");
      return;
    }
    setLoading(true);
    setAdded(null);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("places-street-discovery", {
        body: { street: street.trim(), city: city.trim(), state: state.trim(), client_id: clientId },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      const rows = ((data as any)?.results ?? []) as DiscoveredPlace[];
      setResults(rows);
      setSelected(Object.fromEntries(rows.map((r) => [r.id, true])));
      if (!rows.length) toast.info("No businesses found on that street.");
      else toast.success(`Found ${rows.length} businesses.`);
      const warnings = (data as any)?.warnings ?? [];
      if (warnings.length) console.warn("[street-discovery] partial errors", warnings);
    } catch (e: any) {
      toast.error(e?.message || "Discovery failed.");
    } finally {
      setLoading(false);
    }
  };

  const addToRoute = async () => {
    if (!results || !selectedIds.length) return;
    if (!clientId) {
      toast.error("No workspace resolved for your account.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const chosen = results.filter((r) => selected[r.id]);

      const { data: route, error: routeErr } = await (supabase as any)
        .from("street_sweep_routes")
        .insert({
          client_id: clientId,
          created_by: user.id,
          assigned_to: user.id,
          route_name: `${street.trim()} — ${city.trim()}, ${state.trim().toUpperCase()}`,
          street_name: street.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          status: "in_progress",
        })
        .select("id")
        .single();
      if (routeErr) throw routeErr;

      const { error: visitsErr } = await (supabase as any)
        .from("street_sweep_visits")
        .insert(
          chosen.map((p, i) => ({
            route_id: route.id,
            client_id: clientId,
            visited_by: user.id,
            business_name: p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            niche_guess: prettyType(p.primaryType),
            research_status: "pending",
            sequence: i + 1,
          }))
        );
      if (visitsErr) throw visitsErr;

      setAdded({ count: chosen.length, names: chosen.map((c) => c.name) });
      setResults(null);
      setSelected({});
      toast.success(`Added ${chosen.length} stops to your route.`);
    } catch (e: any) {
      toast.error(e?.message || "Could not add to route.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Street Sweep — Discover via Maps
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pull every business on a street from Google Maps and build a door-knocking route.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find a street</CardTitle>
          <CardDescription>Enter the street you plan to walk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="street">Street name</Label>
              <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="State Street" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santa Barbara" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" />
            </div>
          </div>
          <Button onClick={discover} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? "Searching Google Maps…" : "Discover via Maps"}
          </Button>
        </CardContent>
      </Card>

      {added && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {added.count} businesses added to your route
            </CardTitle>
            <CardDescription>Your street sweep route is ready to walk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5 max-h-60 overflow-auto">
              {added.names.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
            <Button variant="outline" onClick={() => navigate("/employee/street-walk")}>
              <ListChecks className="h-4 w-4 mr-2" />
              Go to Street Walk
            </Button>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{results.length} businesses found</CardTitle>
              <CardDescription>{selectedIds.length} selected</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelected(Object.fromEntries(results.map((r) => [r.id, !allSelected])))
              }
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="divide-y divide-border rounded-md border border-border">
              {results.map((r) => (
                <label
                  key={r.id}
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={!!selected[r.id]}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.address}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {prettyType(r.primaryType)}
                  </Badge>
                </label>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!selectedIds.length || saving}
              onClick={addToRoute}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Selected to My Route ({selectedIds.length})
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
