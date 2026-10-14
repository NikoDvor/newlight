/** Shared constants for BDR meeting outcomes (Discovery / Closing / Onboarding / Pay & Sign). */

export type MeetingKind = "discovery" | "closing" | "onboarding" | "pay_sign";
export type MeetingResult = "won" | "rescheduled" | "lost";
export type NextStep = "form_2" | "form_3" | "activated";

export const MEETING_KINDS: Record<MeetingKind, string> = {
  discovery: "Discovery (Form 1)",
  closing: "Closing (Form 2)",
  onboarding: "Onboarding (Form 3)",
  pay_sign: "Pay & Sign",
};

export const RESCHEDULE_REASONS = {
  no_show: "No-show",
  prospect_asked: "Prospect asked to move",
  needs_to_think: "Needs to think",
  needs_decision_maker: "Needs decision-maker there",
} as const;
export type RescheduleReason = keyof typeof RESCHEDULE_REASONS;

/** Ordered list of lost reasons (key → label). Order is the display order. */
export const LOST_REASONS = {
  not_interested: "Not interested",
  no_value: "Doesn't see the value",
  too_expensive: "Too expensive",
  doesnt_believe: "Doesn't believe we can deliver",
  too_risky: "Too much risk",
  bad_experience: "Tried this before, bad experience",
  doesnt_understand: "Doesn't understand what we do",
  old_school: "Old school",
  no_more_clients: "Doesn't need more clientele",
  compliance: "Compliance won't approve",
  no_commission_pricing: "Can't do commission / revenue-share pricing",
  partner_said_no: "Partner / decision-maker said no",
  no_budget: "No budget right now",
  chose_competitor: "Chose a competitor",
  has_agency: "Already has an agency or in-house team",
  referral_only: "Only grows by referral",
  at_capacity: "At capacity",
  firm_sold: "Firm being sold, merged or acquired",
  retiring: "Retiring or winding down",
  data_privacy_ai: "Data, privacy or AI concerns",
  contract_concerns: "Contract or commitment concerns",
  went_silent: "Went silent",
} as const;
export type LostReason = keyof typeof LOST_REASONS;

export const NEXT_STEP_BY_KIND: Partial<Record<MeetingKind, NextStep>> = {
  discovery: "form_2",
  closing: "form_3",
  onboarding: "activated",
};
