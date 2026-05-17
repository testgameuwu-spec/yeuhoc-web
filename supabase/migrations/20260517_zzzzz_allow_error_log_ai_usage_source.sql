-- Track AI usage from retrying saved questions in Error Log.

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_source_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_source_check
  CHECK (source IN ('practice_chat', 'error_log_retry', 'notification_draft'));
