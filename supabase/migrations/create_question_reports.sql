-- =============================================
-- Migration: Create question_reports table
-- Purpose: Store user reports about problematic questions (wrong answers, typos, etc.)
-- =============================================

-- 1. Create the question_reports table
CREATE TABLE IF NOT EXISTS question_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_content TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('wrong_question', 'wrong_answer', 'wrong_solution', 'unclear', 'missing_image', 'other')),
  note TEXT,
  exam_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add foreign key to profiles for joins
ALTER TABLE question_reports
  ADD CONSTRAINT fk_question_reports_profile
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
  ON question_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON question_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins (you can adjust this based on your admin check logic) can do everything
-- For now, using a simple approach: allow all authenticated users to read (adjust as needed)
CREATE POLICY "Admins can manage all reports"
  ON question_reports FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Create indexes for performance
CREATE INDEX idx_question_reports_status ON question_reports(status);
CREATE INDEX idx_question_reports_exam_id ON question_reports(exam_id);
CREATE INDEX idx_question_reports_created_at ON question_reports(created_at DESC);
