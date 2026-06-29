import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, favicon, and the dev-only
    // /preview routes (no Supabase session — used for UX previews).
    "/((?!_next/static|_next/image|favicon.ico|preview|api/cron|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
