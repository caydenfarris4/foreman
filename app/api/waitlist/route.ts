import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFromAddress, getResend } from "@/lib/resend";
import {
  waitlistConfirmHtml,
  waitlistConfirmSubject,
} from "@/lib/emails/waitlist";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Waitlist capture for foreman.coach/start (the book's QR code).
// Stores the lead in Supabase (service-role only — no keys reach the
// browser), then sends the confirmation through Resend. A repeat signup is
// a friendly success, never an error and never a duplicate row.
const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  source: z.string().trim().min(1).max(40).optional(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "waitlist");
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That doesn't look like an email address — check it and try again." },
      { status: 400 },
    );
  }
  const { email } = parsed.data;
  const source = parsed.data.source ?? "book_qr";

  const admin = createAdminClient();
  const { data: insertedRows, error } = await admin
    .from("waitlist_signups")
    .upsert({ email, source }, { onConflict: "email", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("Waitlist insert failed", error.message);
    return NextResponse.json(
      { error: "Could not save your spot. Give it another try in a minute." },
      { status: 500 },
    );
  }

  // ignoreDuplicates returns zero rows when the email already existed —
  // that's a success for the reader (no duplicate row, no second email).
  const isNew = (insertedRows ?? []).length > 0;

  if (isNew) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: getFromAddress(),
        to: email,
        subject: waitlistConfirmSubject(),
        html: waitlistConfirmHtml(),
      });
    } catch (err) {
      // The lead is stored — that's the part that matters. Log and move on.
      console.error("Waitlist confirmation email failed", err);
    }
  }

  return NextResponse.json({ ok: true, alreadyOnList: !isNew });
}
