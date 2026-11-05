import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase-admin";

function safePath(parts: string[]) {
  if (parts.length !== 2) return null;
  const normalized = parts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return "";
    }
  });
  return normalized.every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part))
    ? normalized.join("/")
    : null;
}

/** Streams only artwork attached to one of the three published hero slots. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const config = getSupabaseConfig();
  const path = safePath((await params).path);
  if (!config || !path) return new NextResponse(null, { status: 404 });

  const query = new URLSearchParams({ select: "slot_key", image_path: `eq.${path}`, limit: "1" });
  const record = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
    headers: { apikey: config.key }, cache: "no-store",
  });
  if (!record.ok || !(await record.json() as unknown[]).length) return new NextResponse(null, { status: 404 });

  const object = await fetch(
    `${config.url}/storage/v1/object/authenticated/homepage-banners/${path.split("/").map(encodeURIComponent).join("/")}`,
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
