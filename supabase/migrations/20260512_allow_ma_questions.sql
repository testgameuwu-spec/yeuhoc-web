-- Allow the multiple-answer question type.
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_type_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_type_check
  CHECK (type IN ('MCQ', 'MA', 'TF', 'SA', 'TEXT', 'DRAG'));
