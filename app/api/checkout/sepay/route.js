import { NextResponse } from 'next/server';
import { SePayPgClient } from 'sepay-pg-node';

export async function POST(request) {
  try {
    const { amount, description, redirectUrl } = await request.json();

    const merchantId = process.env.SEPAY_MERCHANT_ID;
    const secretKey = process.env.SEPAY_SECRET_KEY;

    if (!merchantId || !secretKey) {
      return NextResponse.json(
        { success: false, message: 'SePay credentials not configured on server' },
        { status: 500 }
      );
    }

    const client = new SePayPgClient({
      env: 'production', // Dùng 'production' vì key là LIVE
      merchant_id: merchantId,
      secret_key: secretKey
    });

    const checkoutURL = client.checkout.initCheckoutUrl();
    const invoiceNumber = `DONATE_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const checkoutFormfields = client.checkout.initOneTimePaymentFields({
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: invoiceNumber,
      order_amount: amount || 20000,
      currency: 'VND',
      order_description: description || 'Ung ho YeuHoc',
      success_url: redirectUrl ? `${redirectUrl}?payment=success` : 'https://yeuhoc.site/?payment=success',
      error_url: redirectUrl ? `${redirectUrl}?payment=error` : 'https://yeuhoc.site/?payment=error',
      cancel_url: redirectUrl ? `${redirectUrl}?payment=cancel` : 'https://yeuhoc.site/?payment=cancel',
    });

    return NextResponse.json({
      success: true,
      checkoutURL,
      checkoutFormfields,
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
