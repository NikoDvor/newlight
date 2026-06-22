UPDATE public.nl_training_chapters

SET content = content || E'\n\n---\n\n## Updated Objection Responses — Priority\n*Updated June 21, 2026 — Use pattern interrupt after every objection*\n\n### Not Interested\n1. "I didn\'t expect you to be interested within the first 30 seconds. So we can put a tack in it, but just so I can be proactive when I call again — what kinds of problems would you want me to have answers for?"\n2. "What are you not interested in — is it the timing, the investment, or something that we went over that doesn\'t make sense to you?"\n3. "Setting the marketing system aside, would you oppose us lining up 15 clients for you?"\n\n### Don\'t See the Value\n1. "What were you hoping this would do for your business? What would valuable actually look like in your world?"\n2. "If we went ahead and delivered [specific outcome], what about that would you regret?"'

WHERE module_id = '49e85e03-72b0-4297-95ec-03d60f7db51c'

AND chapter_number = 3;