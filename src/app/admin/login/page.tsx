/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import { ThemeSwitch } from "../theme-switch";
import { LoginForm } from "./login-form";
import styles from "../admin.module.css";

export const metadata: Metadata = {
  title: "Admin Sign In | NS Home Appliances",
};
export const instant = false;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  const configured = isSupabaseConfigured();

  return (
    <main className={`${styles.adminApp} ${styles.loginPage}`}>
      <div className={styles.loginContainer}>
        {/* Left Side: Luxury Editorial Brand Showcase (Desktop >= 960px) */}
        <div className={styles.loginEditorial}>
          <div className={styles.loginEditorialBackdrop}>
            <img
              src="/images/storefront.jpg"
              alt="NS Electronics & Foam Center Storefront"
              className={styles.loginEditorialImage}
            />
            <div className={styles.loginEditorialOverlay} />
          </div>

          <div className={styles.loginEditorialContent}>
            <div>
              <span className={styles.loginBrandTag}>Showroom & Retail Operations</span>
              <h2 className={styles.loginBrandHeading}>NS Home Appliances</h2>
              <p className={styles.loginBrandTagline}>
                Central management system for luxury home appliances, showroom inventory, and customer orders.
              </p>
            </div>

            <div className={styles.loginEditorialFooter}>
              <div className={styles.loginShowroomBadge}>
                <span className={styles.loginShowroomDot} />
                <span>Showroom Operations Active</span>
              </div>
              <p className={styles.loginShowroomAddress}>
                G.T. Road, Gujrat &bull; Authorized Retail Partner
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Panel */}
        <div className={styles.loginAuthPane}>
          <div className={styles.loginCardHeader}>
            <div className={styles.loginHeaderRow}>
              <p className={styles.kicker}>NS Home Appliances</p>
              <ThemeSwitch />
            </div>
            <h1 id="admin-login-title">Admin Portal</h1>
            <p className={styles.loginLead}>
              Sign in with an approved administrator account to access the showroom management dashboard.
            </p>
          </div>

          {!configured && (
            <p className={styles.setupNotice} role="status">
              The secure admin backend is awaiting Supabase connection. Add the project URL and publishable key to the server environment before signing in.
            </p>
          )}

          <LoginForm next={safeNext} />

          <div className={styles.loginCardFooter}>
            <Link href="/" className={styles.loginBackToStoreLink}>
              &larr; Return to storefront
            </Link>
            <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>
              v2.0 Premium
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
