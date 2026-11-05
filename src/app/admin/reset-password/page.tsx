import { ResetPasswordForm } from "./reset-password-form";
import styles from "../admin.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set a new password | NS Home Appliances" };
export const instant = false;

export default function ResetPasswordPage() {
  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard} aria-labelledby="reset-password-title">
        <p className={styles.kicker}>NS HOME APPLIANCES</p>
        <h1 id="reset-password-title">Set a new password</h1>
        <p className={styles.loginLead}>Choose a new password using the secure link from your recovery email.</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
