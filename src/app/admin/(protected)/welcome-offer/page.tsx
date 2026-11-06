import { redirect } from "next/navigation";
import { getAdminAccessTokenForRead } from "@/lib/supabase-admin";

export const instant = false;

export default async function WelcomeOfferAdminPage() {
  // Preserve admin authentication check, then redirect away from retired feature
  await getAdminAccessTokenForRead();
  redirect("/admin");
}
