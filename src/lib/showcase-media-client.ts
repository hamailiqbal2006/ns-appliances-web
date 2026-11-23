import type { ShowcaseMediaKind } from "./showcase-media";

// Reuse a completed upload when retrying a failed save in the same editor.
const completed = new WeakMap<File, Map<string, string>>();

export async function uploadShowcaseMedia(file: File, kind: ShowcaseMediaKind, slot: string): Promise<string> {
  const key = `${kind}:${slot}`;
  const previous = completed.get(file)?.get(key);
  if (previous) return previous;
  const ticket = await fetch("/api/admin/showcase-media-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, slot, contentType: file.type, size: file.size }),
  });
  const data = await ticket.json().catch(() => null) as { path?: string; uploadUrl?: string; error?: string } | null;
  if (!ticket.ok || !data?.path || !data.uploadUrl) {
    throw new Error(data?.error || `Could not prepare the image upload (HTTP ${ticket.status}).`);
  }
  const transfer = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type, "x-upsert": "false", "cache-control": "max-age=3600" },
    body: file,
  });
  if (!transfer.ok) throw new Error(`Image upload failed (HTTP ${transfer.status}). Your draft is still available.`);
  const paths = completed.get(file) ?? new Map<string, string>();
  paths.set(key, data.path);
  completed.set(file, paths);
  return data.path;
}
