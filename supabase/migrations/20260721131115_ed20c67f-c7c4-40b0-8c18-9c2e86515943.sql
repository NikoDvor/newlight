UPDATE nl_training_chapters
SET content = replace(
  content,
  'Route 9 standalone name search. Any hit → Phone Type Owner.',
  'Route 9 standalone name search. Route 9b — DATA BROKER PARTIAL-MATCH (no browser interaction required — pure search). If Routes 1-9 only surfaced a general/front-desk business line, search for the owner by name on data broker/contact-lookup sites (RocketReach, Prospeo, Seamless.AI, ZoomInfo, Lusha). These sites commonly show a PARTIALLY MASKED personal mobile number for free (e.g., ''512-497-XXXX'' — area code and prefix visible, last 4 digits hidden behind a paywall). Do not treat this as a usable phone number — it is not dialable. Instead: (a) confirm whether the visible area code/prefix DIFFERS from the front-desk number already found — if it does, this is real signal a distinct personal line exists, even though it can''t be completed for free; (b) note this in a Confidence Flag beneath the table: ''[Business Name]: personal mobile signal found via [source] (partial: [visible digits]), full number requires a paid data-broker lookup — front desk number used as fallback.'' This route requires no live browsing, only search — it is available regardless of whether Chrome/browser tools are connected. It does not replace Route 8''s flow-walk requirement (which does need live browsing) — this route is phone-only. Any hit → Phone Type Owner.'
)
WHERE id = '96ab38ae-6b56-4536-af0d-a809b4ea181a';

UPDATE nl_training_chapters
SET content = replace(
  content,
  'Field Rules: Research in field / None found / Phone Type rules as before.',
  'Field Rules: Research in field / None found / Phone Type rules as before. Phone Type = Front Desk is the CORRECT and expected classification whenever the only number found is a general/business contact line, even at single-owner firms — do not upgrade to Owner without a route that specifically confirms the number reaches the owner directly (a route, not an assumption based on firm size).'
)
WHERE id = '96ab38ae-6b56-4536-af0d-a809b4ea181a';