import { NextResponse } from 'next/server';

const WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 100;
const LOGIN_LIMIT = 5;

const buckets = globalThis.__yeuhocRateLimitBuckets || new Map();
globalThis.__yeuhocRateLimitBuckets = buckets;

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function getLimit(pathname) {
  const normalizedPathname = pathname.replace(/\/$/, '');
  if (normalizedPathname === '/api/auth/login') return LOGIN_LIMIT;
  return DEFAULT_LIMIT;
}

function cleanup(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function applyRateLimit(request) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, '');
  const now = Date.now();
  const limit = getLimit(pathname);
  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;

  cleanup(now);

  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + WINDOW_MS };

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  if (bucket.count > limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(resetSeconds),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(bucket.resetAt / 1000)),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  return response;
}

export function proxy(request) {
  return applyRateLimit(request);
}

export const config = {
  matcher: '/api/:path*',
};
