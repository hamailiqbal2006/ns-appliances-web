"use client";

import { FormEvent, useState } from "react";
import styles from "../admin.module.css";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("We could not start password recovery. Please try again.");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not start password recovery. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) return <p className={styles.setupNotice} role="status">If that address is approved, a recovery email is on its way. Open the newest email and use its link in this browser.</p>;

  return <form className={styles.loginForm} onSubmit={onSubmit} noValidate>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    {error ? <p className={styles.formError} role="alert">{error}</p> : null}
    <button className={styles.primaryButton} type="submit" disabled={pending}>{pending ? "Sending…" : "Send recovery email"}</button>
  </form>;
}
