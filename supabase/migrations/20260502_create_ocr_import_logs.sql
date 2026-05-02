-- =============================================
-- Migration: Create OCR import logs table
-- Purpose: Observe OCR import health and failures
-- =============================================

CREATE TABLE IF NOT EXISTS public.ocr_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'success', 'failed')),
  stage TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  used_ocr BOOLEAN,
  repaired BOOLEAN,
  extracted_chars INTEGER,
  question_count INTEGER,
  image_candidate_count INTEGER,
  structured_text TEXT,
  image_candidates JSONB,
  duration_ms INTEGER,
  ocr_model TEXT,
  normalize_model TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ocr_import_logs_request_id
  ON public.ocr_import_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_ocr_import_logs_created_at
  ON public.ocr_import_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_import_logs_status_created_at
  ON public.ocr_import_logs(status, created_at DESC);

ALTER TABLE public.ocr_import_logs ENABLE ROW LEVEL SECURITY;

-- Restrict read access to admins only.
CREATE POLICY "Admins can read ocr logs"
  ON public.ocr_import_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Intentionally no INSERT/UPDATE policy for authenticated users:
-- server writes use service role key.
