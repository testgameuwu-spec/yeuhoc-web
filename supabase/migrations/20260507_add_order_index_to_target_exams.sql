-- Allow admins to define display order for target exams.

ALTER TABLE public.target_exams
  ADD COLUMN IF NOT EXISTS order_index INTEGER;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY exam_date ASC, name ASC, created_at ASC) - 1 AS next_order_index
  FROM public.target_exams
)
UPDATE public.target_exams
SET order_index = ordered.next_order_index
FROM ordered
WHERE target_exams.id = ordered.id
  AND target_exams.order_index IS NULL;

UPDATE public.target_exams
SET order_index = 0
WHERE order_index IS NULL;

ALTER TABLE public.target_exams
  ALTER COLUMN order_index SET DEFAULT 0,
  ALTER COLUMN order_index SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_target_exams_order_index
  ON public.target_exams(order_index);
