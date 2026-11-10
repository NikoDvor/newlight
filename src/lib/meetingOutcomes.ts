/** Shared constants for BDR meeting outcomes (Discovery / Closing / Onboarding / Pay & Sign). */

export type MeetingKind = "discovery" | "closing" | "onboarding" | "pay_sign" | "check_in";
export type MeetingResult = "won" | "rescheduled" | "lost" | "another_meeting";
export type NextStep = "form_2" | "form_3" | "activated" | "completed" | "extra_meeting";

export const MEETING_KINDS: Record<MeetingKind, string> = {
  discovery: "Discovery (Form 1)",
  closing: "Closing (Form 2)",
  onboarding: "Onboarding (Form 3)",
  pay_sign: "Pay & Sign",
  check_in: "Check-in",
};

export const RESCHEDULE_REASONS = {
  no_show: "No-show",
  prospect_asked: "Prospect asked to move",
  needs_to_think: "Needs to think",
  needs_decision_maker: "Needs decision-maker there",
} as const;
export type RescheduleReason = keyof typeof RESCHEDULE_REASONS;

/** They came to the meeting but aren't ready for the next step yet — why another meeting first. */
export const ANOTHER_MEETING_REASONS = {
  needs_decision_maker: "Wants a decision-maker there",
  needs_more_info: "Wants more information first",
  needs_to_think: "Needs time to think",
  review_numbers: "Wants to review the numbers / plan",
  ran_out_of_time: "Ran out of time",
  other: "Other",
} as const;
export type AnotherMeetingReason = keyof typeof ANOTHER_MEETING_REASONS;

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
