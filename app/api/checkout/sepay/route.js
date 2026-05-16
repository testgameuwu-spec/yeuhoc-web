import { NextResponse } from 'next/server';
import { SePayPgClient } from 'sepay-pg-node';

const DEFAULT_SITE_URL = 'https://www.yeuhoc.site';

function getSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

function resolveSafeReturnUrl(redirectUrl) {
  const siteUrl = getSiteUrl();
  const fallbackUrl = new URL('/', siteUrl);

  if (typeof redirectUrl !== 'string' || !redirectUrl.trim()) {
    return fallbackUrl;
  }

  try {
    const candidate = new URL(redirectUrl.trim(), siteUrl);
    if (candidate.origin !== siteUrl.origin) {
      return fallbackUrl;
    }
    return candidate;
  } catch {
    return fallbackUrl;
  }
}

function withPaymentStatus(returnUrl, status) {
  const url = new URL(returnUrl.toString());
  url.searchParams.set('payment', status);
  return url.toString();
}

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
    const returnUrl = resolveSafeReturnUrl(redirectUrl);

    const checkoutFormfields = client.checkout.initOneTimePaymentFields({
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: invoiceNumber,
      order_amount: amount || 20000,
      currency: 'VND',
      order_description: description || 'Ung ho YeuHoc',
      success_url: withPaymentStatus(returnUrl, 'success'),
      error_url: withPaymentStatus(returnUrl, 'error'),
      cancel_url: withPaymentStatus(returnUrl, 'cancel'),
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
