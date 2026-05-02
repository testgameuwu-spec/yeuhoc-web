-- =============================================
-- Migration: Add token usage columns to ocr_import_logs
-- Purpose: Track AI token consumption per OCR request
-- =============================================

ALTER TABLE public.ocr_import_logs
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;

COMMENT ON COLUMN public.ocr_import_logs.prompt_tokens IS 'Total input tokens consumed across all AI calls';
COMMENT ON COLUMN public.ocr_import_logs.completion_tokens IS 'Total output tokens consumed across all AI calls';
COMMENT ON COLUMN public.ocr_import_logs.total_tokens IS 'Total tokens (prompt + completion) consumed';
