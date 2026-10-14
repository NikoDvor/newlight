import { supabase } from "@/integrations/supabase/client";

// ── Profile Types ──
export const PROFILE_TYPES = [
  { value: "consultative_sales", label: "Financial Firm", description: "Discovery, review and planning meetings, Zoom-first", zoomDefault: true },
  { value: "custom_hybrid", label: "Custom / Hybrid", description: "Manual configuration — admin selects everything", zoomDefault: true },
] as const;

export type ProfileType = typeof PROFILE_TYPES[number]["value"];

// ── Profile Pack Definitions ──
export interface CalendarPackItem {
  calendar_name: string;
  calendar_type: string;
  appointment_types: string[];
  default_duration: number;
  location_type: string;
}

export interface FormPackItem {
  form_name: string;
  form_type: string;
}

export interface ReminderPackItem {
  reminder_type: string;
  channel: string;
  offset_minutes: number;
}

export interface ProfilePackDefinition {
  calendars: CalendarPackItem[];
  forms: FormPackItem[];
  reminders: ReminderPackItem[];
  zoom_enabled: boolean;
  reminder_channels: { email: boolean; sms: boolean };
  module_flags: Record<string, boolean>;
}

const PROFILE_PACKS: Record<string, ProfilePackDefinition> = {
  consultative_sales: {
    calendars: [
      { calendar_name: "Client Meetings", calendar_type: "booking", appointment_types: ["Discovery Call", "Financial Review", "Planning Session"], default_duration: 60, location_type: "virtual" },
      { calendar_name: "Onboarding", calendar_type: "booking", appointment_types: ["Onboarding Meeting", "Account Setup"], default_duration: 60, location_type: "virtual" },
    ],
    forms: [
      { form_name: "Prospect Intake", form_type: "intake" },
    ],
    reminders: [
      { reminder_type: "before_appointment", channel: "email", offset_minutes: 1440 },
      { reminder_type: "before_appointment", channel: "email", offset_minutes: 15 },
    ],
    zoom_enabled: true,
    reminder_channels: { email: true, sms: false },
    module_flags: { meeting_intelligence: true, zoom_meetings: true },
  },
  custom_hybrid: {
    calendars: [],
    forms: [],
    reminders: [],
    zoom_enabled: true,
    reminder_channels: { email: true, sms: false },
    module_flags: {},
  },
};

// ── Provisional Profile Guess ──
export function guessProvisionalProfile(businessType: string): { profile: ProfileType; zoomDefault: boolean } {
  void businessType;
  return { profile: "consultative_sales", zoomDefault: true };
}

export function getProfilePack(profileType: string): ProfilePackDefinition {
  return PROFILE_PACKS[profileType] || PROFILE_PACKS.consultative_sales;
}

// ── Profile Application Engine (activation-time only) ──
export interface ProfileApplicationOptions {
  clientId: string;
  profileType: ProfileType;
  zoomEnabled: boolean;
  reminderChannels?: { email: boolean; sms: boolean };
  moduleFlags?: Record<string, boolean>;
  overrideCalendars?: boolean;
  overrideForms?: boolean;
  overrideCadence?: boolean;
  overrideWorkflows?: boolean;
  appliedBy?: string;
}

export interface ProfileApplicationResult {
  calendarsCreated: number;
  appointmentTypesCreated: number;
  formsCreated: number;
  remindersCreated: number;
  automationsCreated: number;
  skipped: string[];
  errors: string[];
}

export async function applyProfileToWorkspace(opts: ProfileApplicationOptions): Promise<ProfileApplicationResult> {
  const { clientId, profileType, zoomEnabled, appliedBy } = opts;
  const pack = getProfilePack(profileType);
  const result: ProfileApplicationResult = {
    calendarsCreated: 0, appointmentTypesCreated: 0, formsCreated: 0,
    remindersCreated: 0, automationsCreated: 0, skipped: [], errors: [],
  };

  // 1. Check/create workspace_profiles row
  const { data: existingProfile } = await supabase
    .from("workspace_profiles" as any)
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  const profileRow = existingProfile as any;

  // 2. Calendar pack (idempotent)
  if (!profileRow?.calendar_pack_applied) {
    for (const calDef of pack.calendars) {
      const { data: existing } = await supabase.from("calendars")
        .select("id").eq("client_id", clientId).eq("calendar_name", calDef.calendar_name).maybeSingle();
      if (existing) { result.skipped.push(`Calendar: ${calDef.calendar_name}`); continue; }

      const { data: cal, error: calErr } = await supabase.from("calendars").insert({
        client_id: clientId, calendar_name: calDef.calendar_name,
        calendar_type: calDef.calendar_type, is_active: true,
        default_location: calDef.location_type,
      }).select("id").single();

      if (calErr || !cal) { result.errors.push(`Calendar ${calDef.calendar_name}: ${calErr?.message}`); continue; }
      result.calendarsCreated++;

      // Create availability (Mon-Fri 9-5)
      for (const day of [1, 2, 3, 4, 5]) {
        await supabase.from("calendar_availability").insert({
          client_id: clientId, calendar_id: cal.id, day_of_week: day,
          start_time: "09:00", end_time: "17:00", slot_interval_minutes: 30, is_active: true,
        });
      }

      // Create appointment types
      for (const typeName of calDef.appointment_types) {
        const { data: existType } = await supabase.from("calendar_appointment_types")
          .select("id").eq("client_id", clientId).eq("calendar_id", cal.id).eq("name", typeName).maybeSingle();
        if (existType) { result.skipped.push(`Appt type: ${typeName}`); continue; }

        const { error: typeErr } = await supabase.from("calendar_appointment_types").insert({
          client_id: clientId, calendar_id: cal.id, name: typeName,
          duration_minutes: calDef.default_duration, location_type: calDef.location_type,
          is_active: true, reminders_enabled: true,
        });
        if (typeErr) result.errors.push(`Appt type ${typeName}: ${typeErr.message}`);
        else result.appointmentTypesCreated++;
      }

      // Create reminders for this calendar
      for (const rem of pack.reminders) {
        const { data: existRem } = await supabase.from("calendar_reminder_rules")
          .select("id").eq("client_id", clientId).eq("calendar_id", cal.id)
          .eq("channel", rem.channel).eq("offset_minutes", rem.offset_minutes).maybeSingle();
        if (existRem) { result.skipped.push(`Reminder: ${rem.channel} ${rem.offset_minutes}m`); continue; }

        const { error: remErr } = await supabase.from("calendar_reminder_rules").insert({
          client_id: clientId, calendar_id: cal.id,
          reminder_type: rem.reminder_type, channel: rem.channel,
          offset_minutes: rem.offset_minutes, is_active: true,
        });
        if (remErr) result.errors.push(`Reminder: ${remErr.message}`);
        else result.remindersCreated++;
      }
    }
  } else {
    result.skipped.push("Calendar pack (already applied)");
  }

  // 3. Form pack (idempotent)
  if (!profileRow?.form_pack_applied) {
    let order = 0;
    for (const formDef of pack.forms) {
      const { data: existing } = await supabase.from("client_forms")
        .select("id").eq("client_id", clientId).eq("form_name", formDef.form_name).maybeSingle();
      if (existing) { result.skipped.push(`Form: ${formDef.form_name}`); continue; }

      const { error: formErr } = await supabase.from("client_forms").insert({
        client_id: clientId, form_name: formDef.form_name,
        form_type: formDef.form_type, form_status: "draft", display_order: order++,
      });
      if (formErr) result.errors.push(`Form ${formDef.form_name}: ${formErr.message}`);
      else result.formsCreated++;
    }
  } else {
    result.skipped.push("Form pack (already applied)");
  }

  // 4. Upsert workspace_profiles
  const finalReminderChannels = opts.reminderChannels || pack.reminder_channels;
  const finalModuleFlags = opts.moduleFlags || pack.module_flags;

  const profileData: any = {
    client_id: clientId,
    profile_type: profileType,
    zoom_enabled: zoomEnabled,
    calendar_pack_applied: !profileRow?.calendar_pack_applied ? true : profileRow.calendar_pack_applied,
    form_pack_applied: !profileRow?.form_pack_applied ? true : profileRow.form_pack_applied,
    cadence_pack_applied: true,
    workflow_pack_applied: true,
    config_overrides: { reminder_channels: finalReminderChannels, module_flags: finalModuleFlags },
    applied_at: new Date().toISOString(),
    applied_by: appliedBy || null,
  };

  if (profileRow) {
    await supabase.from("workspace_profiles" as any).update(profileData).eq("client_id", clientId);
  } else {
    await supabase.from("workspace_profiles" as any).insert(profileData);
  }

  // 5. Upsert workspace_automation_config
  const configData: any = {
    client_id: clientId,
    zoom_enabled: zoomEnabled,
    reminder_channels: finalReminderChannels,
    module_flags: finalModuleFlags,
  };

  const { data: existingConfig } = await supabase
    .from("workspace_automation_config" as any)
    .select("id").eq("client_id", clientId).maybeSingle();

  if (existingConfig) {
    await supabase.from("workspace_automation_config" as any).update(configData).eq("client_id", clientId);
  } else {
    await supabase.from("workspace_automation_config" as any).insert(configData);
  }

  // 6. Audit log
  await supabase.from("audit_logs").insert({
    action: "profile_applied_to_workspace",
    client_id: clientId,
    module: "activation",
    metadata: {
      profile_type: profileType,
      zoom_enabled: zoomEnabled,
      calendars_created: result.calendarsCreated,
      forms_created: result.formsCreated,
      reminders_created: result.remindersCreated,
      skipped: result.skipped,
      errors: result.errors,
    },
  });

  await supabase.from("crm_activities").insert({
    client_id: clientId,
    activity_type: "profile_applied",
    activity_note: `Automation profile "${profileType}" applied — ${result.calendarsCreated} calendars, ${result.formsCreated} forms, ${result.remindersCreated} reminders created`,
  });

  return result;
}
