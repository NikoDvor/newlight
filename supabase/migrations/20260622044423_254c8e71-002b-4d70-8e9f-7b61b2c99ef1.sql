UPDATE public.nl_training_chapters

SET content = content || E'\n\n---\n\n## Updated Objection Responses — Priority\n*Updated June 21, 2026 — Use pattern interrupt after every objection*\n\n### Too Expensive\n1. "What would be the more expensive option — the 30 thousand in missed revenue through those 15 clients, or the 10K you\'re spending right now? → Well alright, I guess we\'re on the same page now. Tell you what, to make this work, let\'s set you up on a payment plan. We can do 2 options: 2 months at $5K/month or 4 months at $3K/month. What makes more sense to you?"'

WHERE module_id = '49e85e03-72b0-4297-95ec-03d60f7db51c'

AND chapter_number = 5;