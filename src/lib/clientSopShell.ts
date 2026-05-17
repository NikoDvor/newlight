import { supabase } from "@/integrations/supabase/client";

/**
 * Placeholder ("demo shell") SOP content auto-seeded when a client sub-account
 * is first created. It populates Module 1 & Module 2 of the Training Center so
 * the client can see what the system will do, without exposing any other
 * client's real SOPs. Real content is written later from the closing/go-live
 * form (AdminCloseConfirm), which also flips `is_demo_shell` to false.
 */
export const DEMO_SOP_SHELL = {
  company_intro:
    "[DEMO PLACEHOLDER]\n\nThis is where your company introduction will go. In the live version, your team will learn who you are, what you do, and the story behind your business — all written from your closing/go-live form.\n\nReplace this content from the Closing & Activation form.",
  core_offer:
    "[DEMO PLACEHOLDER]\n\nThis is where your core offer will go: what you sell, the outcome it delivers for customers, and the reason it's worth the price.\n\nReplace this content from the Closing & Activation form.",
  sales_process:
    "[DEMO PLACEHOLDER]\n\nThis is where your sales process will go, step by step — from first contact to closed customer. Your team will learn it here before they ever take a call.\n\nReplace this content from the Closing & Activation form.",
  scripts:
    "[DEMO PLACEHOLDER]\n\nThis is where your scripts will go: opener, qualifying questions, pitch, close, and common objection handling.\n\nReplace this content from the Closing & Activation form.",
} as const;

/**
 * Idempotently seed a demo SOP shell for a freshly-created client. Safe to call
 * from any client-creation path — does nothing if a row already exists.
 */
export async function seedDemoSopShell(clientId: string): Promise<void> {
  if (!clientId) return;
  await (supabase as any)
    .from("client_training_sop")
    .upsert(
      {
        client_id: clientId,
        ...DEMO_SOP_SHELL,
        is_demo_shell: true,
        bdr_training_enabled: false,
      },
      { onConflict: "client_id", ignoreDuplicates: true },
    );
}
