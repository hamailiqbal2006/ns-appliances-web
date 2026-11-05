import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase-admin";

const LOCAL_ORIGIN = "http://localhost:3000";

function passwordResetRedirect() {
  const configuredOrigin = process.env.SITE_URL;
  if (configuredOrigin) {
    try {
      const origin = new URL(configuredOrigin).origin;
      return new URL("/admin/reset-password", origin).toString();
    } catch {
      return null;
    }
  }
  return process.env.NODE_ENV === "production" ? null : `${LOCAL_ORIGIN}/admin/reset-password`;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request was rejected for security reasons." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const config = getSupabaseConfig();
  const redirectTo = passwordResetRedirect();
  if (!config || !redirectTo || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "We could not start password recovery. Please try again." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
    cache: "no-store",
  });
  const providerMessage = await response.text();
  // Supabase deliberately returns a generic result for unknown addresses. Preserve that boundary.
  if (response.status === 429 || /rate limit/i.test(providerMessage)) {
    return NextResponse.json({ error: "A recovery email was requested recently. Wait one minute, then try again." }, { status: 429 });
  }
  console.error(`Password recovery request was rejected by Supabase (HTTP ${response.status}).`);
  if (!response.ok) return NextResponse.json({ error: "We could not start password recovery. Please try again." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
