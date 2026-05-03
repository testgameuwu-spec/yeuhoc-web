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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Thời gian nhận webhook vào hệ thống
);

-- Bật Row Level Security (nếu cần)
ALTER TABLE sepay_transactions ENABLE ROW LEVEL SECURITY;

-- Tạo policy chỉ cho phép admin select và read (chỉ áp dụng nếu user kết nối qua Supabase client)
CREATE POLICY "Cho phép admin xem giao dịch" ON sepay_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Tắt policy insert/update cho client. Việc insert/update chỉ thực hiện qua Service Role Key trên API Endpoint
CREATE POLICY "Chỉ Service Role mới được thay đổi giao dịch" ON sepay_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
