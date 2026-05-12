-- Preserve the authored order of questions within each exam.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS order_index INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'created_at'
  ) THEN
    WITH ordered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY exam_id
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) - 1 AS next_order_index
      FROM public.questions
      WHERE order_index IS NULL
    )
    UPDATE public.questions
    SET order_index = ordered.next_order_index
    FROM ordered
    WHERE questions.id = ordered.id;
  ELSE
    WITH ordered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY exam_id
          ORDER BY id ASC
        ) - 1 AS next_order_index
      FROM public.questions
      WHERE order_index IS NULL
    )
    UPDATE public.questions
    SET order_index = ordered.next_order_index
    FROM ordered
    WHERE questions.id = ordered.id;
  END IF;
END $$;

ALTER TABLE public.questions
  ALTER COLUMN order_index SET DEFAULT 0,
  ALTER COLUMN order_index SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_exam_id_order_index
  ON public.questions(exam_id, order_index);
