import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

// 5 requests per 15 minutes, sliding window. Applied per (bucket, identifier)
// so a heavy library user isn't blocked from submitting a retro.
const LIMIT = 5;
const WINDOW = "15 m";

let limiter: Ratelimit | null = null;
let warned = false;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      // Fail-open in dev / unconfigured envs so local work isn't broken.
      // In production the env vars MUST be set or rate limiting silently
      // does nothing.
      console.warn(
        "Rate limiting disabled: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set",
      );
      warned = true;
    }
    return null;
  }
  const redis = new Redis({ url, token });
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    analytics: false,
    prefix: "foreman:rl",
  });
  return limiter;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const ip = fwd.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Returns a 429 NextResponse if the caller is over the limit, or null if
// the request should proceed. Call this at the very top of a route handler,
// before any auth or DB work, so abuse can't burn resources.
export async function enforceRateLimit(
  request: NextRequest,
  bucket: string,
): Promise<NextResponse | null> {
  const lim = getLimiter();
  if (!lim) return null;
  const key = `${bucket}:${clientIp(request)}`;
  const { success, limit, remaining, reset } = await lim.limit(key);
  const headers = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
  };
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "Too many requests. Please wait and try again.",
      retryAfterSeconds: retryAfter,
    },
    {
      status: 429,
      headers: { ...headers, "Retry-After": String(retryAfter) },
    },
  );
}
