import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Ưu tiên dùng Service Role Key để bỏ qua RLS khi insert từ backend
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    // Kiểm tra API Key (nếu có cấu hình trong .env.local)
    const authHeader = request.headers.get('Authorization');
    const expectedApiKey = process.env.SEPAY_API_KEY;

    if (expectedApiKey && authHeader !== `Apikey ${expectedApiKey}`) {
      console.error('Sepay Webhook: Unauthorized. Invalid or missing API Key.');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    const {
      id,
      gateway,
      transactionDate,
      accountNumber,
      code,
      content,
      transferType,
      transferAmount,
      accumulated,
      subAccount,
      referenceCode,
      description
    } = payload;

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing transaction ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('sepay_transactions')
      .insert({
        id,
        gateway,
        transaction_date: transactionDate,
        account_number: accountNumber,
        code,
        content,
        transfer_type: transferType,
        transfer_amount: transferAmount,
        accumulated,
        sub_account: subAccount,
        reference_code: referenceCode,
        description
      });

    if (error) {
      // Mã lỗi 23505 là Unique Violation (trùng lặp Primary Key)
      if (error.code === '23505') { 
        console.log(`Sepay transaction ${id} already exists (duplicate webhook). Ignored.`);
        return NextResponse.json({ success: true, message: 'Duplicate transaction' }, { status: 200 });
      }
      
      console.error('Error inserting sepay transaction:', error);
      return NextResponse.json({ success: false, message: 'Database error', error: error.message }, { status: 500 });
    }

    console.log(`Sepay transaction ${id} saved successfully! Amount: ${transferAmount} ${transferType}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
