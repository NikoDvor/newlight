-- Delete BDR Module 7 (Discovery & Meeting Prep) and its chapters/questions
DELETE FROM public.nl_training_questions
WHERE chapter_id IN (
  SELECT id FROM public.nl_training_chapters
  WHERE module_id = '076d11a3-11bd-49d8-991c-8f905124ab55'
);

DELETE FROM public.nl_training_chapters
WHERE module_id = '076d11a3-11bd-49d8-991c-8f905124ab55';

DELETE FROM public.nl_training_modules
WHERE id = '076d11a3-11bd-49d8-991c-8f905124ab55';

-- Renumber + rename what was Module 8 -> 7 (Product Knowledge)
UPDATE public.nl_training_modules
SET module_number = 7,
    module_title = 'Product Knowledge',
    module_description = 'Master the NewLight product suite, understand what each service does, and learn how to position value based on the prospect''s specific situation'
WHERE id = '4457d2a3-a291-489e-be00-f319f4012eb3';

-- Renumber + rename what was Module 9 -> 8 (Daily Cadence & Standards)
UPDATE public.nl_training_modules
SET module_number = 8,
    module_title = 'Daily Cadence & Standards',
    module_description = 'The daily operating system of a high-performing BDR — shift prep, KPIs, activity standards, weekly reviews, and what elite performance looks like week over week'
WHERE id = 'd501cfaf-1d83-4471-97ae-e3f586423bb3';