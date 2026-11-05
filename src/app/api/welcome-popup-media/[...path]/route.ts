import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase-admin";

function safePath(parts: string[]) {
  if (parts.length !== 2) return null;
  const normalized = parts.map((part) => {
    try { return decodeURIComponent(part); } catch { return ""; }
  });
  return normalized[0] === "welcome" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized[1])
    ? normalized.join("/")
    : null;
}

/** Streams only the image currently attached to the public welcome popup. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const config = getSupabaseConfig();
  const path = safePath((await params).path);
  if (!config || !path) return new NextResponse(null, { status: 404 });

  const query = new URLSearchParams({ select: "singleton", singleton: "eq.true", image_path: `eq.${path}`, limit: "1" });
  const record = await fetch(`${config.url}/rest/v1/welcome_popup_settings?${query}`, {
    headers: { apikey: config.key }, cache: "no-store",
  });
  if (!record.ok || !(await record.json() as unknown[]).length) return new NextResponse(null, { status: 404 });

  const object = await fetch(
    `${config.url}/storage/v1/object/authenticated/welcome-popup-media/${path.split("/").map(encodeURIComponent).join("/")}`,
    { headers: { apikey: config.key }, cache: "no-store" },
  );
  const contentType = object.headers.get("content-type") ?? "";
  if (!object.ok || !object.body || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
