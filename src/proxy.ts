/**
 * Next.js proxy for API rate limiting, CORS, and security headers.
 *
 * Runs on all `/api/*` routes. Adds security headers to every response,
 * handles CORS preflight, and enforces per-IP rate limits backed by Upstash Redis.
 *
 * Resilience: if Redis is unavailable, requests are allowed through with a warning.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { apiErrorResponse } from "@/lib/api-errors";

// ─── Redis ───────────────────────────────────────────────────────────────────

let redis: Redis | null = null;
try {
  redis = Redis.fromEnv();
} catch {
  // Redis env vars not present; rate limiting will be skipped.
}

// ─── Rate Limit Rules ────────────────────────────────────────────────────────

const RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  "/api/scan": { limit: 15, windowSeconds: 60 },
  "/api/scan/pair": { limit: 15, windowSeconds: 60 },
  "/api/scan/pools": { limit: 15, windowSeconds: 60 },
  "/api/indicators": { limit: 20, windowSeconds: 60 },
  "/api/pools/new": { limit: 30, windowSeconds: 60 },
  "/api/resolve-address": { limit: 30, windowSeconds: 60 },
};

// ─── Security Headers ────────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && origin === siteUrl) return true;

  if (origin === request.nextUrl.origin) return true;

  return false;
}

function applySecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ─── Proxy ───────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname;

  // CORS preflight
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    if (!isAllowedOrigin(request)) {
      return applySecurityHeaders(new NextResponse(null, { status: 403 }));
    }

    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get("origin");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    response.headers.set(
      "Access-Control-Allow-Origin",
      origin ?? siteUrl ?? request.nextUrl.origin,
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return applySecurityHeaders(response);
  }

  const response = NextResponse.next();

  // Security headers
  applySecurityHeaders(response);

  // CORS for API routes
  if (pathname.startsWith("/api/")) {
    if (isAllowedOrigin(request)) {
      const origin = request.headers.get("origin");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      response.headers.set(
        "Access-Control-Allow-Origin",
        origin ?? siteUrl ?? request.nextUrl.origin,
      );
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    }
  }

  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development") {
    return response;
  }

  const rule = RATE_LIMITS[pathname];
  if (!rule || !redis) {
    return response;
  }

  const ip = getClientIp(request);
  const key = `rate_limit:${pathname}:${ip}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, rule.windowSeconds);
    const results = await pipeline.exec();
    const count = (results?.[0] ?? 0) as number;

    if (count > rule.limit) {
      const error = apiErrorResponse(
        "INTERNAL_ERROR",
        "Rate limit exceeded. Please try again later.",
        429,
      );
      error.headers.set("Retry-After", String(rule.windowSeconds));
      return applySecurityHeaders(error);
    }
  } catch (err) {
    console.warn("[proxy] Redis unavailable, allowing request:", err);
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
