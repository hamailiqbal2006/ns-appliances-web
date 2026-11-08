import type { Metadata } from "next";
import Link from "next/link";
import { ThemeSwitch } from "../theme-switch";
import { ForgotPasswordForm } from "./forgot-password-form";
import styles from "../admin.module.css";

export const metadata: Metadata = {
  title: "Recover Password | NS Home Appliances",
};
export const instant = false;

export default function ForgotPasswordPage() {
  return (
    <main className={`${styles.adminApp} ${styles.loginPage}`}>
      <section className={styles.loginCard} aria-labelledby="forgot-password-title">
        <div className={styles.loginHeaderRow}>
          <p className={styles.kicker}>NS Home Appliances</p>
          <ThemeSwitch />
        </div>
        <h1 id="forgot-password-title">Reset your password</h1>
        <p className={styles.loginLead}>
          Enter the email address for your approved administrator account. A secure reset link will be sent.
        </p>
        <ForgotPasswordForm />
        <div className={styles.loginCardFooter}>
          <Link className={styles.loginBackToStoreLink} href="/admin/login">
            &larr; Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
