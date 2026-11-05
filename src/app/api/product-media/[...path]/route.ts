import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase-admin";

function safePath(parts: string[]) {
  if (!parts.length) return null;
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

/**
 * Streams one Storage object through the app. The associated Storage RLS policy
 * permits anonymous reads only when this exact object belongs to an active
 * product; an authenticated admin can still preview inactive product media.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const config = getSupabaseConfig();
  const path = safePath((await params).path);
  if (!config || !path) return new NextResponse(null, { status: 404 });

  const accessToken = (await cookies()).get("ns-admin-access")?.value;
  const authHeader = accessToken ? `Bearer ${accessToken}` : `Bearer ${config.key}`;
  const response = await fetch(
    `${config.url}/storage/v1/object/authenticated/product-images/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      headers: {
        apikey: config.key,
        Authorization: authHeader,
      },
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok || !response.body) return new NextResponse(null, { status: 404 });

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      // Never let an authenticated admin preview of inactive media enter a
      // shared cache. Anonymous responses are already constrained by Storage RLS.
      "Cache-Control": accessToken
        ? "private, no-store"
        : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
