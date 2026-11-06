import { redirect } from "next/navigation";
import { getAdminAccessTokenForRead } from "@/lib/supabase-admin";

export async function GET() {
  await getAdminAccessTokenForRead();
  redirect("/admin");
}
