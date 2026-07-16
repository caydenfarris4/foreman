import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, favicon, the dev-only
    // /preview routes (no Supabase session — used for UX previews), and the
    // PWA surface (manifest, service worker, offline page, Play Store
    // assetlinks) — all public, and sw.js/.well-known are fetched without
    // cookies anyway.
    "/((?!_next/static|_next/image|favicon.ico|preview|api/cron|api/stripe/webhook|api/email/unsubscribe|manifest\\.webmanifest|sw\\.js|offline\\.html|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
