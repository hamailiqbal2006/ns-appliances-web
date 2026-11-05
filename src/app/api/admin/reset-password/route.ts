import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase-admin";

async function isApprovedAdmin(accessToken: string) {
  const config = getSupabaseConfig();
  if (!config) return false;
  const response = await fetch(`${config.url}/rest/v1/profiles?select=id&role=eq.admin&limit=1`, {
    headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return false;
  return (await response.json() as Array<{ id: string }>).length === 1;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && origin !== `${request.headers.get("x-forwarded-proto") ?? "http"}://${host}`) {
    return NextResponse.json({ error: "This request was rejected for security reasons." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { accessToken?: unknown; password?: unknown } | null;
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const config = getSupabaseConfig();
  if (!config || !accessToken || password.length < 8 || password.length > 256) {
    return NextResponse.json({ error: "The recovery request is invalid or has expired." }, { status: 400 });
  }
  if (!(await isApprovedAdmin(accessToken))) {
    return NextResponse.json({ error: "This recovery link is invalid or has expired. Request another recovery email." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "This recovery link is invalid or has expired. Request another recovery email." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
