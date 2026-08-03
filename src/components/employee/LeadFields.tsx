import { Phone, Calendar, CalendarClock, ExternalLink, MapPin, CalendarCheck2 } from "lucide-react";
import { parseLeadFlags, stripLeadFlags, getLeadPhones, type LeadPhoneShape } from "@/lib/leadFlags";
import {
  bookingSystemState, bookingSystemPlatform, bookingSystemDetail,
  parseLeadConfidence, parseVerificationMethods, type BookingSystemShape,
} from "@/lib/bookingSystem";

/**
 * Canonical lead-field renderers shared by BDR Dialer, Street Walk and My Leads
 * so the tag conventions/colors stay identical across every surface.
 */

export interface LeadDisplayShape extends LeadPhoneShape, BookingSystemShape {
  business_name?: string | null;
  owner_name?: string | null;
  city?: string | null;
  niche?: string | null;
  notes?: string | null;
  street_address?: string | null;
  street_number?: number | null;
  side_of_street?: string | null;
  source_type?: string | null;
  booking_link?: string | null;
  booking_link_is_owner?: boolean | null;
  owner_calendar_confirmed?: boolean | null;
  owner_booking_link?: string | null;
  owner_booking_link_send_ready?: string | null;
  self_booking_widget_non_owner?: boolean | null;
  dialer_bookable?: boolean | null;
}

const pill = "rounded-full px-1.5 py-0.5 text-[9px] font-bold";

/* ─── Owner name + CORPORATE / BOOTH RENTER / BD-AFFILIATED flags ─── */
export function LeadOwner({ lead, className }: { lead: LeadDisplayShape; className?: string }) {
  const flags = parseLeadFlags(lead.owner_name);
  const cleaned = stripLeadFlags(lead.owner_name);
  return (
    <div className={`flex flex-col gap-1 ${className || ""}`}>
      <span className="text-white/70 break-words leading-snug">{cleaned || "—"}</span>
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map(f => (
            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: "hsla(0,72%,50%,.18)", color: "hsl(0,72%,72%)", border: "1px solid hsla(0,72%,50%,.4)" }}>{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Phone numbers, each tagged Owner Direct / Front Desk / Phone ─── */
export function LeadPhones({ lead, onDial, className }: { lead: LeadDisplayShape; onDial?: () => void; className?: string }) {
  const phones = getLeadPhones(lead);
  if (phones.length === 0) return <span className="text-white/30 text-xs">—</span>;
  return (
    <div className={`flex flex-col gap-1 ${className || ""}`}>
      {phones.map(p => {
        const isOwner = p.kind === "owner_direct" || p.kind === "legacy_owner";
        const isFrontDesk = p.kind === "front_desk" || p.kind === "legacy_front_desk";
        return (
          <span key={p.kind + p.number} className="inline-flex items-center gap-1 flex-wrap">
            <a href={`tel:${p.number}`} onClick={(e) => { e.stopPropagation(); onDial?.(); }}
              className="font-mono inline-flex items-center gap-1 hover:underline text-xs" style={{ color: "hsl(211,96%,68%)" }}>
              <Phone className="h-3 w-3" /> {p.number}
            </a>
            {isOwner ? (
              <span className={pill} style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }}>Owner Direct</span>
            ) : isFrontDesk ? (
              <span className={pill} style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>Front Desk</span>
            ) : (
              <span className={pill} style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>Phone</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ─── Website link ─── */
export function LeadWebsite({ lead, className }: { lead: LeadDisplayShape; className?: string }) {
  if (!lead.website) return <span className="text-white/30 text-xs">—</span>;
  const href = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      className={`text-xs inline-flex items-center gap-1 hover:underline break-all ${className || ""}`}
      style={{ color: "hsl(211,96%,68%)" }} title={lead.website}>
      <ExternalLink className="h-3 w-3 shrink-0" />
      {lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")}
    </a>
  );
}

/* ─── Booking-system Yes / No / Unknown badge (5-method check) ─── */
export function BookingSystemBadge({ lead, showPlatform = true, className }: {
  lead: BookingSystemShape; showPlatform?: boolean; className?: string;
}) {
  const state = bookingSystemState(lead);
  const platform = bookingSystemPlatform(lead);
  const title = bookingSystemDetail(lead);
  const style = state === "yes"
    ? { background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,55%)", border: "1px solid hsla(142,72%,42%,.35)" }
    : state === "no"
      ? { background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,70%)", border: "1px solid hsla(0,0%,50%,.3)" }
      : { background: "hsla(43,96%,55%,.12)", color: "hsl(43,96%,70%)", border: "1px dashed hsla(43,96%,55%,.4)" };
  const label = state === "yes"
    ? (showPlatform && platform ? platform : "Yes")
    : state === "no" ? "No" : "Unknown";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 cursor-help ${className || ""}`}
      style={style} title={title}>
      <CalendarCheck2 className="h-3 w-3" />
      {label}
    </span>
  );
}

/* ─── Booking links / widget tags (identical to the dialer's) ─── */
export function LeadBookingLinks({ lead }: { lead: LeadDisplayShape }) {
  const ownerLink = lead.owner_booking_link_send_ready || lead.owner_booking_link;
  const conf = lead.owner_calendar_confirmed ?? lead.booking_link_is_owner;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ownerLink && (
        <a href={ownerLink.startsWith("http") ? ownerLink : `https://${ownerLink}`} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold hover:brightness-110 w-fit uppercase tracking-wide"
          style={{ background: "linear-gradient(135deg, hsla(38,95%,55%,.28), hsla(38,95%,50%,.18))", color: "hsl(38,100%,72%)", border: "1px solid hsla(38,95%,55%,.6)" }}
          title={`Send-ready owner calendar link: ${ownerLink}`}>
          <Calendar className="h-3 w-3" /> Book with Owner
        </a>
      )}
      {lead.booking_link && !ownerLink && (
        <a href={lead.booking_link.startsWith("http") ? lead.booking_link : `https://${lead.booking_link}`}
          target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="text-xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium hover:underline w-fit"
          style={conf === true
            ? { background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }
            : { background: "hsla(211,96%,56%,.12)", color: "hsl(211,96%,68%)", border: "1px dashed hsla(211,96%,60%,.35)" }}
          title={lead.booking_link}>
          <Calendar className="h-3 w-3" />
          {conf === true ? "Owner's Calendar" : conf === false ? "Booking Link (not owner)" : "Booking Link"}
        </a>
      )}
      {lead.self_booking_widget_non_owner && conf !== true && (
        <span className="text-[10px] inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium w-fit"
          style={{ background: "hsla(280,70%,60%,.15)", color: "hsl(280,80%,78%)", border: "1px solid hsla(280,70%,60%,.4)" }}
          title="Self-booking widget exists but not confirmed as the owner's">
          <CalendarClock className="h-3 w-3" /> Self-Booking Widget
        </span>
      )}
      {lead.dialer_bookable === true && (
        <span className="text-[10px] rounded-full px-2 py-0.5 font-bold uppercase tracking-wide"
          title="Platform supports embedded booking from the dialer"
          style={{ background: "hsla(142,80%,45%,.22)", color: "hsl(142,85%,68%)", border: "1px solid hsla(142,80%,50%,.55)" }}>
          Dialer-Bookable
        </span>
      )}
    </div>
  );
}

/* ─── Address / niche / source / confidence meta tags ─── */
export function LeadMetaTags({ lead }: { lead: LeadDisplayShape }) {
  const confidence = parseLeadConfidence(lead.notes);
  const address = lead.street_address || (lead.street_number != null ? String(lead.street_number) : null);
  const confTone = confidence === "High"
    ? { background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,55%)" }
    : confidence === "Medium"
      ? { background: "hsla(43,96%,55%,.14)", color: "hsl(43,96%,70%)" }
      : { background: "hsla(0,72%,50%,.15)", color: "hsl(0,72%,72%)" };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {address && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1"
          style={{ background: "hsla(211,96%,56%,.12)", color: "hsl(211,96%,70%)" }} title={lead.street_address || undefined}>
          <MapPin className="h-3 w-3" />{address}{lead.city ? `, ${lead.city}` : ""}
        </span>
      )}
      {!address && lead.city && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "hsla(211,96%,56%,.10)", color: "hsl(211,96%,70%)" }}>{lead.city}</span>
      )}
      {lead.side_of_street && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,70%)" }}>{lead.side_of_street} side</span>
      )}
      {lead.niche && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "hsla(262,80%,65%,.14)", color: "hsl(262,80%,78%)" }}>{lead.niche}</span>
      )}
      {lead.source_type === "street_sweep" && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: "hsla(190,90%,55%,.12)", color: "hsl(190,90%,70%)", border: "1px solid hsla(190,90%,55%,.3)" }}>
          Research in field
        </span>
      )}
      {confidence && (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={confTone}
          title="Researcher-reported confidence, parsed from notes">
          {confidence} confidence
        </span>
      )}
    </div>
  );
}

/* ─── Notes + verification method line ─── */
export function LeadNotes({ lead, clamp = false }: { lead: LeadDisplayShape; clamp?: boolean }) {
  const verification = parseVerificationMethods(lead.notes);
  if (!lead.notes) return null;
  return (
    <div className="space-y-1">
      {verification && (
        <p className="text-[10px] text-white/45">Verified via: {verification}</p>
      )}
      <p className={`text-xs text-white/60 whitespace-pre-wrap break-words ${clamp ? "line-clamp-3" : ""}`}>{lead.notes}</p>
    </div>
  );
}

/* ─── Full labeled lead detail block ───────────────────────────────
 * Mirrors the Dialer spreadsheet's columns (Business / Owner / Phone /
 * Website / Booking Sys / Notes) as a stacked, labeled card so the Street
 * Walk surface shows exactly the same data with the same tag conventions.
 */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] uppercase tracking-wider text-white/40 w-[74px] shrink-0 pt-0.5">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function LeadDetailBlock({ lead, clampNotes = false }: { lead: LeadDisplayShape; clampNotes?: boolean }) {
  return (
    <div className="space-y-1.5">
      {lead.street_address && (
        <FieldRow label="Address">
          <span className="text-xs text-white/70 break-words">{lead.street_address}{lead.city ? `, ${lead.city}` : ""}</span>
        </FieldRow>
      )}
      <FieldRow label="Owner"><LeadOwner lead={lead} /></FieldRow>
      <FieldRow label="Phone"><LeadPhones lead={lead} /></FieldRow>
      <FieldRow label="Website"><LeadWebsite lead={lead} /></FieldRow>
      <FieldRow label="Booking">
        <div className="flex flex-wrap items-center gap-1.5">
          <BookingSystemBadge lead={lead} />
          <LeadBookingLinks lead={lead} />
        </div>
      </FieldRow>
      <FieldRow label="Tags"><LeadMetaTags lead={lead} /></FieldRow>
      {lead.notes && (
        <FieldRow label="Notes"><LeadNotes lead={lead} clamp={clampNotes} /></FieldRow>
      )}
    </div>
  );
}
