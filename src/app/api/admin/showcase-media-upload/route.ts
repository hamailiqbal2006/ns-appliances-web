import { NextResponse } from "next/server";
import { createShowcaseMediaUploadUrl, requireAdminForAction } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { accessToken } = await requireAdminForAction();
    const body = await request.json();
    if (!body || !["category", "desktop", "mobile"].includes(body.kind) || typeof body.slot !== "string" || typeof body.contentType !== "string" || typeof body.size !== "number") {
      return NextResponse.json({ error: "Invalid image upload request." }, { status: 400 });
    }
    const upload = await createShowcaseMediaUploadUrl(body, accessToken);
    return NextResponse.json(upload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare image upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
