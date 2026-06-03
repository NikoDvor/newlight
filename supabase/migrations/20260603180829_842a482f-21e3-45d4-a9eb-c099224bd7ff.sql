DELETE FROM public.nl_training_chapters
WHERE module_id = 'f8a8a8a8-0009-4000-8000-000000000009'
AND chapter_number > 3;

UPDATE public.nl_training_modules
SET module_title = 'Mindset & The Life You''re Building',
    module_description = 'Set your goals, define your why, and map out the life you are working toward. This module is about you.'
WHERE id = 'f8a8a8a8-0009-4000-8000-000000000009';