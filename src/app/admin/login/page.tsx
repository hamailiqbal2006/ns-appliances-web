import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { LoginForm } from "./login-form";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Admin sign in | NS Home Appliances" };
export const instant = false;

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  const configured = isSupabaseConfigured();

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard} aria-labelledby="admin-login-title">
        <p className={styles.kicker}>NS Home Appliances</p>
        <h1 id="admin-login-title">Admin portal</h1>
        <p className={styles.loginLead}>Sign in with an approved administrator account.</p>
        {!configured ? <p className={styles.setupNotice} role="status">The secure admin backend is awaiting Supabase connection. Add the project URL and publishable key to the server environment before signing in.</p> : null}
        <LoginForm next={safeNext} />
      </section>
    </main>
  );
}
