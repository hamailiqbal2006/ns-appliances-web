import { NextResponse } from "next/server";
import { createProductMediaUploadUrl, requireAdminForAction } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const kind = body.kind === "image" || body.kind === "video" ? body.kind : null;
    if (!kind || typeof body.uploadId !== "string" || typeof body.fileName !== "string" || typeof body.contentType !== "string" || typeof body.size !== "number") {
      return NextResponse.json({ error: "Invalid media upload request." }, { status: 400 });
    }
    const { accessToken } = await requireAdminForAction();
    const upload = await createProductMediaUploadUrl({
      uploadId: body.uploadId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
      kind,
    }, accessToken);
    return NextResponse.json(upload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare the media upload.";
    return NextResponse.json({ error: message }, { status: /session is no longer authorized/i.test(message) ? 401 : 400 });
  }
}
