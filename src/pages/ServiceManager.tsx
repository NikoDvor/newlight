import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShoppingBag, Plus, Pencil, Trash2, Calendar, Link2, Package, Tag,
  GripVertical, Archive, CheckCircle2, FileText, ChevronRight
} from "lucide-react";

interface Service {
  id: string; service_name: string; service_slug: string | null; service_description: string | null;
  display_price_text: string | null; service_status: string; display_order: number;
  linked_calendar_id: string | null; linked_appointment_type_id: string | null;
}

interface Product {
  id: string; product_name: string; product_slug: string | null; product_description: string | null;
  display_price_text: string | null; product_status: string; display_order: number;
}

interface Offer {
  id: string; offer_name: string; offer_description: string | null; offer_type: string;
  display_status: string; display_order: number;
}

const statusColors: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)" },
  live: { label: "Live", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)" },
  archived: { label: "Archived", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.4)" },
  promotion: { label: "Promotion", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)" },
  bundle: { label: "Bundle", color: "hsl(280 60% 50%)", bg: "hsla(280,60%,50%,.1)" },
  seasonal: { label: "Seasonal", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)" },
};

function EmptyState({ title, desc, onAdd }: { title: string; desc: string; onAdd: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsla(211,96%,56%,.08)" }}>
        <ShoppingBag className="h-7 w-7" style={{ color: "hsl(211 96% 56%)" }} />
      </div>
      <p className="text-sm font-bold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">{desc}</p>
      <Button size="sm" className="btn-gradient gap-1" onClick={onAdd}><Plus className="h-3.5 w-3.5" /> Add First</Button>
    </div>
  );
}

export default function ServiceManager() {
  const { activeClientId } = useWorkspace();
  const [tab, setTab] = useState("services");
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [editSheet, setEditSheet] = useState<{ type: string; item: any } | null>(null);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    if (!activeClientId) return;
    const [s, p, o, c, at] = await Promise.all([
      supabase.from("service_catalog" as any).select("*").eq("client_id", activeClientId).order("display_order"),
      supabase.from("product_catalog" as any).select("*").eq("client_id", activeClientId).order("display_order"),
      supabase.from("offer_catalog" as any).select("*").eq("client_id", activeClientId).order("display_order"),
      supabase.from("calendars").select("id, calendar_name").eq("client_id", activeClientId),
      supabase.from("calendar_appointment_types").select("id, name, calendar_id").eq("client_id", activeClientId),
    ]);
    setServices((s.data || []) as any);
    setProducts((p.data || []) as any);
    setOffers((o.data || []) as any);
    setCalendars(c.data || []);
    setAppointmentTypes(at.data || []);
  };

  useEffect(() => { load(); }, [activeClientId]);

  const openNew = (type: string) => {
    setForm(type === "service" ? { service_name: "", service_description: "", display_price_text: "", service_status: "draft", linked_calendar_id: "", linked_appointment_type_id: "" }
      : type === "product" ? { product_name: "", product_description: "", display_price_text: "", product_status: "draft" }
      : { offer_name: "", offer_description: "", offer_type: "promotion", display_status: "draft" });
    setEditSheet({ type, item: null });
  };

  const openEdit = (type: string, item: any) => {
    setForm({ ...item, linked_calendar_id: item.linked_calendar_id || "", linked_appointment_type_id: item.linked_appointment_type_id || "" });
    setEditSheet({ type, item });
  };

  const save = async () => {
    if (!activeClientId || !editSheet) return;
    const { type, item } = editSheet;
    const table = type === "service" ? "service_catalog" : type === "product" ? "product_catalog" : "offer_catalog";
    const payload = { ...form, client_id: activeClientId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (payload.linked_calendar_id === "") payload.linked_calendar_id = null;
    if (payload.linked_appointment_type_id === "") payload.linked_appointment_type_id = null;

    const { error } = item
      ? await supabase.from(table as any).update(payload).eq("id", item.id)
      : await supabase.from(table as any).insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(item ? "Updated" : "Created");
    setEditSheet(null);
    load();
  };

  const remove = async (type: string, id: string) => {
    const table = type === "service" ? "service_catalog" : type === "product" ? "product_catalog" : "offer_catalog";
    await supabase.from(table as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const ItemCard = ({ type, item, nameKey, statusKey }: { type: string; item: any; nameKey: string; statusKey: string }) => {
    const sc = statusColors[item[statusKey]] || statusColors.draft;
    return (
      <motion.div className="card-widget flex items-center gap-4 group" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
          {type === "service" ? <ShoppingBag className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} /> :
           type === "product" ? <Package className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} /> :
           <Tag className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{item[nameKey]}</p>
            <Badge variant="outline" className="text-[9px] px-1.5 shrink-0" style={{ color: sc.color, background: sc.bg, borderColor: "transparent" }}>{sc.label}</Badge>
          </div>
          {item.display_price_text && <p className="text-[11px] text-muted-foreground">{item.display_price_text}</p>}
          {type === "service" && item.linked_calendar_id && (
            <p className="text-[10px] text-primary/60 flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" /> Linked to calendar</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(type, item)}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(type, item.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div>
      <PageHeader title="Services & Products" description="Manage your service catalog, products, and offers" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="services" className="gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Services</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Products</TabsTrigger>
          <TabsTrigger value="offers" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="btn-gradient gap-1" onClick={() => openNew("service")}><Plus className="h-3.5 w-3.5" /> Add Service</Button>
          </div>
          {services.length === 0 ? (
            <EmptyState title="No Services Yet" desc="Add your services to connect them with calendars, booking forms, and your website." onAdd={() => openNew("service")} />
          ) : (
            <div className="space-y-3">{services.map(s => <ItemCard key={s.id} type="service" item={s} nameKey="service_name" statusKey="service_status" />)}</div>
          )}
        </TabsContent>

        <TabsContent value="products">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="btn-gradient gap-1" onClick={() => openNew("product")}><Plus className="h-3.5 w-3.5" /> Add Product</Button>
          </div>
          {products.length === 0 ? (
            <EmptyState title="No Products Yet" desc="Add products to display on your website and track in your CRM." onAdd={() => openNew("product")} />
          ) : (
            <div className="space-y-3">{products.map(p => <ItemCard key={p.id} type="product" item={p} nameKey="product_name" statusKey="product_status" />)}</div>
          )}
        </TabsContent>

        <TabsContent value="offers">
          <div className="flex justify-end mb-4">
            <Button size="sm" className="btn-gradient gap-1" onClick={() => openNew("offer")}><Plus className="h-3.5 w-3.5" /> Add Offer</Button>
          </div>
          {offers.length === 0 ? (
            <EmptyState title="No Offers Yet" desc="Create promotions, bundles, or seasonal offers for your business." onAdd={() => openNew("offer")} />
          ) : (
            <div className="space-y-3">{offers.map(o => <ItemCard key={o.id} type="offer" item={o} nameKey="offer_name" statusKey="display_status" />)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit/Create Sheet */}
      <Sheet open={!!editSheet} onOpenChange={() => setEditSheet(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editSheet?.item ? "Edit" : "Add"} {editSheet?.type === "service" ? "Service" : editSheet?.type === "product" ? "Product" : "Offer"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {editSheet?.type === "service" && <>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Service Name</label>
                <Input value={form.service_name || ""} onChange={e => setForm({ ...form, service_name: e.target.value })} placeholder="e.g. Consultation" className="h-9 text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <Textarea value={form.service_description || ""} onChange={e => setForm({ ...form, service_description: e.target.value })} rows={3} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Display Price</label>
                <Input value={form.display_price_text || ""} onChange={e => setForm({ ...form, display_price_text: e.target.value })} placeholder="e.g. Starting at $99" className="h-9 text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                <Select value={form.service_status} onValueChange={v => setForm({ ...form, service_status: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select></div>
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} /> Booking Connection</p>
                <div className="space-y-3">
                  <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Linked Calendar</label>
                    <Select value={form.linked_calendar_id || ""} onValueChange={v => setForm({ ...form, linked_calendar_id: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {calendars.map(c => <SelectItem key={c.id} value={c.id}>{c.calendar_name}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                  <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Appointment Type</label>
                    <Select value={form.linked_appointment_type_id || ""} onValueChange={v => setForm({ ...form, linked_appointment_type_id: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {appointmentTypes.filter(a => !form.linked_calendar_id || a.calendar_id === form.linked_calendar_id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                </div>
              </div>
            </>}
            {editSheet?.type === "product" && <>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Product Name</label>
                <Input value={form.product_name || ""} onChange={e => setForm({ ...form, product_name: e.target.value })} className="h-9 text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <Textarea value={form.product_description || ""} onChange={e => setForm({ ...form, product_description: e.target.value })} rows={3} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Display Price</label>
                <Input value={form.display_price_text || ""} onChange={e => setForm({ ...form, display_price_text: e.target.value })} className="h-9 text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                <Select value={form.product_status} onValueChange={v => setForm({ ...form, product_status: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select></div>
            </>}
            {editSheet?.type === "offer" && <>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Offer Name</label>
                <Input value={form.offer_name || ""} onChange={e => setForm({ ...form, offer_name: e.target.value })} className="h-9 text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <Textarea value={form.offer_description || ""} onChange={e => setForm({ ...form, offer_description: e.target.value })} rows={3} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Type</label>
                <Select value={form.offer_type} onValueChange={v => setForm({ ...form, offer_type: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="promotion">Promotion</SelectItem><SelectItem value="bundle">Bundle</SelectItem><SelectItem value="seasonal">Seasonal</SelectItem></SelectContent>
                </Select></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                <Select value={form.display_status} onValueChange={v => setForm({ ...form, display_status: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select></div>
            </>}
            <div className="flex gap-2 pt-4">
              <Button className="btn-gradient flex-1" onClick={save}>{editSheet?.item ? "Save Changes" : "Create"}</Button>
              <Button variant="outline" onClick={() => setEditSheet(null)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
