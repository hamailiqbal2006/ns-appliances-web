import type { Metadata } from "next";
import { AdminShell } from "../admin-shell";
import { requireAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "NS Admin" };
export const instant = false;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  return (
    <AdminShell name={admin.fullName || admin.email}>
      {children}
    </AdminShell>
  );
}
