-- Cập nhật bảng exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS allow_review BOOLEAN DEFAULT TRUE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_question_level BOOLEAN DEFAULT TRUE;

-- Bảng cài đặt hệ thống (System Settings)
CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Giá trị khởi tạo mặc định
INSERT INTO site_settings (id, value)
VALUES (
    'general',
    '{"maintenanceMode": false, "maintenanceMessage": "Hệ thống đang bảo trì, vui lòng quay lại sau.", "noticeMessage": "", "showNotice": false}'::jsonb
) ON CONFLICT (id) DO NOTHING;
