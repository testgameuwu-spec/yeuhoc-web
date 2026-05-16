-- Create the sepay_transactions table to store incoming webhooks
CREATE TABLE IF NOT EXISTS sepay_transactions (
    id BIGINT PRIMARY KEY, -- ID giao dịch trên SePay
    gateway VARCHAR(100), -- Brand name của ngân hàng
    transaction_date TIMESTAMP, -- Thời gian xảy ra giao dịch phía ngân hàng
    account_number VARCHAR(100), -- Số tài khoản ngân hàng
    code VARCHAR(100), -- Mã code thanh toán (sepay tự nhận diện)
    content TEXT, -- Nội dung chuyển khoản
    transfer_type VARCHAR(20), -- 'in' là tiền vào, 'out' là tiền ra
    transfer_amount NUMERIC, -- Số tiền giao dịch
    accumulated NUMERIC, -- Số dư tài khoản (lũy kế)
    sub_account VARCHAR(100), -- Tài khoản ngân hàng phụ (tài khoản định danh)
    reference_code VARCHAR(150), -- Mã tham chiếu của tin nhắn sms
    description TEXT, -- Toàn bộ nội dung tin nhắn sms
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Thời gian nhận webhook vào hệ thống
    user_id UUID REFERENCES profiles(id) -- Tự động nhận diện user đã nạp tiền
);

-- Bật Row Level Security
ALTER TABLE sepay_transactions ENABLE ROW LEVEL SECURITY;

-- Cho phép admin xem giao dịch (qua Supabase client đã đăng nhập)
CREATE POLICY "Cho phép admin xem giao dịch" ON sepay_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Webhook inserts must use the service role key from the Next.js route.
REVOKE INSERT ON sepay_transactions FROM anon, authenticated;
