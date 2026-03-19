import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, FileText, DollarSign, Clock, Zap,
  Shield, Loader2, PenTool, Calendar, ArrowRight
} from "lucide-react";

export default function ProposalView() {
  const { token } = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [signing, setSigning] = useState(false);
  const [sigForm, setSigForm] = useState({ name: "", email: "", reason: "" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: p } = await supabase
        .from("proposals")
        .select("*")
        .eq("share_token", token)
        .single();
      if (!p) { setNotFound(true); setLoading(false); return; }

      // Mark as viewed
      if (!p.viewed_at) {
        await supabase.from("proposals").update({ viewed_at: new Date().toISOString(), proposal_status: p.proposal_status === "sent" ? "viewed" : p.proposal_status } as any).eq("id", p.id);
        p.viewed_at = new Date().toISOString();
        if (p.proposal_status === "sent") p.proposal_status = "viewed";
      }

      const [sRes, lRes] = await Promise.all([
        supabase.from("proposal_sections").select("*").eq("proposal_id", p.id).order("section_order"),
        supabase.from("proposal_line_items").select("*").eq("proposal_id", p.id).order("sort_order"),
      ]);
      setProposal(p);
      setSections(sRes.data || []);
      setLineItems(lRes.data || []);
      setLoading(false);
    })();
  }, [token]);

  // Canvas drawing helpers
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e40af";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleAccept = async () => {
    if (!sigForm.name || !sigForm.email) { toast.error("Name and email required"); return; }
    if (!hasSignature) { toast.error("Please sign before accepting"); return; }
    setSigning(true);
    try {
      const sigData = canvasRef.current?.toDataURL("image/png") || "";
      await supabase.from("proposal_signatures").insert({
        proposal_id: proposal.id,
        signer_name: sigForm.name,
        signer_email: sigForm.email,
        signature_data: sigData,
        ip_address: null,
      });
      await supabase.from("proposals").update({
        proposal_status: "accepted",
        accepted_at: new Date().toISOString(),
      } as any).eq("id", proposal.id);

      // Log audit
      await supabase.from("audit_logs").insert({
        action: "proposal_accepted",
        module: "sales",
        metadata: { proposal_id: proposal.id, signer: sigForm.name },
      });

      setProposal({ ...proposal, proposal_status: "accepted", accepted_at: new Date().toISOString() });
      setShowAccept(false);
      toast.success("Proposal accepted!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    setSigning(true);
    try {
      await supabase.from("proposals").update({
        proposal_status: "declined",
        declined_at: new Date().toISOString(),
        rejection_reason: sigForm.reason || null,
      } as any).eq("id", proposal.id);
      await supabase.from("audit_logs").insert({
        action: "proposal_rejected",
        module: "sales",
        metadata: { proposal_id: proposal.id, reason: sigForm.reason },
      });
      setProposal({ ...proposal, proposal_status: "declined" });
      setShowReject(false);
      toast.success("Response recorded");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSigning(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)" }}>
      <Loader2 className="h-8 w-8 animate-spin text-white/40" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)" }}>
      <Card className="max-w-md border-0 text-center p-8" style={{ background: "hsla(218,35%,14%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
        <FileText className="h-12 w-12 mx-auto mb-4 text-white/20" />
        <h2 className="text-lg font-bold text-white mb-2">Proposal Not Found</h2>
        <p className="text-sm text-white/40">This link may have expired or is invalid.</p>
      </Card>
    </div>
  );

  const isTerminal = ["accepted", "declined", "expired"].includes(proposal.proposal_status);
  const totalLineItems = lineItems.reduce((s, i) => s + Number(i.total_price || 0), 0);
  const templateConfig = typeof proposal.template_config === "string" ? JSON.parse(proposal.template_config || "{}") : {};

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)" }}>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{ top: "-150px", right: "-100px", background: "radial-gradient(circle, hsla(211,96%,62%,.1), transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ bottom: "-100px", left: "-80px", background: "radial-gradient(circle, hsla(197,92%,68%,.07), transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <motion.div className="max-w-3xl mx-auto relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))", boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)" }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">NewLight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{proposal.proposal_title}</h1>
          <p className="text-sm text-white/40">Service Proposal · v{proposal.version_number || 1}</p>
        </div>

        {/* Status Banner */}
        {proposal.proposal_status === "accepted" && (
          <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ background: "hsla(140,60%,50%,.1)", border: "1px solid hsla(140,60%,50%,.2)" }}>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div><p className="text-sm font-semibold text-emerald-300">Proposal Accepted</p><p className="text-xs text-emerald-400/60">Accepted on {new Date(proposal.accepted_at).toLocaleDateString()}</p></div>
          </div>
        )}
        {proposal.proposal_status === "declined" && (
          <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ background: "hsla(0,60%,50%,.1)", border: "1px solid hsla(0,60%,50%,.2)" }}>
            <XCircle className="h-5 w-5 text-red-400" />
            <div><p className="text-sm font-semibold text-red-300">Proposal Declined</p></div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)", border: "1px solid hsla(211,96%,60%,.12)", boxShadow: "0 20px 60px -15px hsla(211,96%,56%,.15)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: DollarSign, label: "Setup Fee", value: `$${Number(proposal.setup_fee || 0).toLocaleString()}` },
              { icon: Calendar, label: "Monthly", value: `$${Number(proposal.monthly_fee || 0).toLocaleString()}/mo` },
              { icon: Clock, label: "Term", value: proposal.contract_term || "—" },
              { icon: Shield, label: "Ad Spend", value: proposal.ad_spend_commitment ? `$${Number(proposal.ad_spend_commitment).toLocaleString()}/mo` : "N/A" },
            ].map(m => (
              <div key={m.label} className="text-center">
                <m.icon className="h-5 w-5 mx-auto mb-1 text-[hsl(var(--nl-sky))]" />
                <p className="text-[10px] text-white/40 uppercase">{m.label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Client-facing Notes */}
        {(proposal.offer_summary || proposal.notes_client) && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <h2 className="text-sm font-semibold text-white mb-3">Overview</h2>
            <p className="text-sm text-white/60 whitespace-pre-wrap">{proposal.offer_summary || proposal.notes_client}</p>
          </div>
        )}

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <h2 className="text-sm font-semibold text-white mb-4">Services & Deliverables</h2>
            <div className="space-y-2">
              {lineItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                  <div>
                    <p className="text-sm text-white">{item.item_name}</p>
                    {item.item_description && <p className="text-[10px] text-white/40 mt-0.5">{item.item_description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">${Number(item.total_price || 0).toLocaleString()}</p>
                    {item.quantity > 1 && <p className="text-[10px] text-white/40">{item.quantity} × ${Number(item.unit_price || 0).toLocaleString()}</p>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-white/10">
                <p className="text-sm font-semibold text-white/60">Total</p>
                <p className="text-sm font-bold text-white">${totalLineItems.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        {sections.map(s => (
          <div key={s.id} className="rounded-2xl p-6 mb-6" style={{ background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <h2 className="text-sm font-semibold text-white mb-3">{s.section_title}</h2>
            <div className="text-sm text-white/60 whitespace-pre-wrap">{s.content}</div>
          </div>
        ))}

        {/* Expiration */}
        {proposal.expires_at && !isTerminal && (
          <p className="text-center text-xs text-white/30 mb-6">
            This proposal expires on {new Date(proposal.expires_at).toLocaleDateString()}
          </p>
        )}

        {/* Actions */}
        {!isTerminal && (
          <div className="flex gap-3 justify-center mb-8">
            <Button onClick={() => setShowAccept(true)} className="h-12 px-8 text-sm font-semibold text-white border-0" style={{ background: "linear-gradient(135deg, hsl(140 60% 45%), hsl(160 70% 40%))", boxShadow: "0 4px 20px -4px hsla(140,60%,45%,.4)" }}>
              <CheckCircle className="h-4 w-4 mr-2" /> Accept Proposal
            </Button>
            <Button variant="outline" onClick={() => setShowReject(true)} className="h-12 px-8 text-sm border-white/10 text-white/60 hover:bg-white/5">
              <XCircle className="h-4 w-4 mr-2" /> Decline
            </Button>
          </div>
        )}

        <p className="text-center text-[10px] text-white/15 mb-4">Powered by <span className="font-semibold">NewLight</span> Marketing</p>
      </motion.div>

      {/* Accept Dialog */}
      <Dialog open={showAccept} onOpenChange={setShowAccept}>
        <DialogContent className="max-w-md border-white/10 text-white" style={{ background: "hsl(220,35%,12%)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">Accept Proposal</DialogTitle>
            <DialogDescription className="text-white/40">Please review and sign to confirm your acceptance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg p-3 text-xs text-white/50" style={{ background: "hsla(211,96%,60%,.06)" }}>
              By signing below, you agree to the terms of this proposal including the pricing, scope of services, and contract length outlined above.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-white/60 text-xs">Full Name *</Label><Input value={sigForm.name} onChange={e => setSigForm({ ...sigForm, name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
              <div className="space-y-1"><Label className="text-white/60 text-xs">Email *</Label><Input value={sigForm.email} onChange={e => setSigForm({ ...sigForm, email: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-white/60 text-xs">Signature *</Label>
              <div className="rounded-lg border border-white/10 bg-white/5 relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  className="w-full h-[120px] cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                <button onClick={clearCanvas} className="absolute top-1 right-1 text-[9px] text-white/30 hover:text-white/60 px-2 py-0.5 rounded bg-white/5">Clear</button>
              </div>
            </div>
            <Button onClick={handleAccept} disabled={signing} className="w-full h-11 text-white border-0" style={{ background: "linear-gradient(135deg, hsl(140 60% 45%), hsl(160 70% 40%))" }}>
              {signing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
              Sign & Accept
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-sm border-white/10 text-white" style={{ background: "hsl(220,35%,12%)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">Decline Proposal</DialogTitle>
            <DialogDescription className="text-white/40">We'd appreciate knowing why so we can improve.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1"><Label className="text-white/60 text-xs">Reason (optional)</Label><Textarea value={sigForm.reason} onChange={e => setSigForm({ ...sigForm, reason: e.target.value })} className="bg-white/5 border-white/10 text-white min-h-[80px]" placeholder="Too expensive, not the right fit, etc." /></div>
            <Button onClick={handleReject} disabled={signing} variant="destructive" className="w-full">
              {signing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Confirm Decline
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
