-- Nov 14, 2026: Command Center setup = 1 x average client value, Enterprise setup = 2 x average client value
-- (previously fixed $25,000 / $40,000). Prices come from code defaults (nl_package_defaults has no overrides).
-- This migration only records the training-content edits that were applied live (idempotent).
update public.nl_training_chapters set content = replace(replace(replace(replace(replace(replace(replace(content,
'| $25,000 | 1 average client |','| 1 × their average client | 1 average client |'),
'| $40,000 | 2 average clients |','| 2 × their average client | 2 average clients |'),
'- **Command Center:** setup **$25,000**, monthly = **1 average client**.','- **Command Center:** setup = **1 average client**, monthly = **1 average client**.'),
'- **Enterprise:** setup **$40,000**, monthly = **2 average clients**.','- **Enterprise:** setup = **2 average clients**, monthly = **2 average clients**.'),
'Example: a $10,000 average client → Command Center is $10,000 a month, Enterprise $20,000 a month.','Example: a $10,000 average client → Command Center is $10,000 setup and $10,000 a month; Enterprise is $20,000 setup and $20,000 a month.'),
'(25,000 + 110,000) × 0.8 = **$108,000**. After: **$96,000** a year.','(10,000 + 110,000) × 0.8 = **$96,000**. After: **$96,000** a year.'),
'(40,000 + 220,000) × 0.8 = **$208,000**. After: **$192,000** a year.','(20,000 + 220,000) × 0.8 = **$192,000**. After: **$192,000** a year.')
where id='2a733b4a-b9fe-4637-afb5-f3e967112798';
update public.nl_training_questions set options='["$108,000","$96,000","$120,000","$135,000"]'::jsonb, correct_index=1, explanation='(10,000 + 11 × 10,000) × 0.8.' where id='7d9b749d-1ac3-41c3-9e37-6f7e95f5aaae';
update public.nl_training_questions set options='["1 average client setup + 1 average client a month","2 average clients setup + 2 a month","$25,000 + $8,000 a month","1 average client setup + ½ a month"]'::jsonb, explanation='Step 3: the app and pipeline. Setup and monthly are each one average client, fixed at signing.' where id='0abcda56-9459-4005-8dd0-91f3f9caa6fd';
