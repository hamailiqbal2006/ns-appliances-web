import { redirect } from "next/navigation";
import { getAdminAccessTokenForRead } from "@/lib/supabase-admin";

export const instant = false;

export default async function CustomersAdminPage() {
  // Preserve admin authentication check, then safely redirect away from retired feature
  await getAdminAccessTokenForRead();
  redirect("/admin");
}
