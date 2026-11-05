import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Recover password | NS Home Appliances" };
export const instant = false;

export default function ForgotPasswordPage() {
  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard} aria-labelledby="forgot-password-title">
        <p className={styles.kicker}>NS Home Appliances</p>
        <h1 id="forgot-password-title">Reset your password</h1>
        <p className={styles.loginLead}>Enter the email address for your approved administrator account.</p>
        <ForgotPasswordForm />
        <p className={styles.loginLead}><Link className={styles.textButton} href="/admin/login">Back to sign in</Link></p>
      </section>
    </main>
  );
}
