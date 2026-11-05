"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "../admin.module.css";

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("access_token");
    const timer = window.setTimeout(() => {
      if (token) {
      // A recovery token belongs in the browser fragment, never in history or referrers.
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
      setAccessToken(token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (!accessToken) return setError("This recovery link is missing or has expired. Request a new password recovery email.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmPassword) return setError("The two passwords do not match.");

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "We could not update the password.");
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not update the password.");
    } finally {
      setPending(false);
    }
  }

  if (complete) return <p className={styles.setupNotice} role="status">Password updated. Return to the admin sign-in page and sign in with your new password.</p>;

  if (accessToken === undefined) return <p className={styles.setupNotice} role="status">Checking your recovery link…</p>;

  if (!accessToken) return <><p className={styles.setupNotice} role="alert">This recovery link is missing or has expired. Request a new password recovery email.</p><Link className={styles.textButton} href="/admin/forgot-password">Request a new recovery email</Link></>;

  return <form className={styles.loginForm} onSubmit={onSubmit} noValidate>
    <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={8} /></label>
    <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></label>
    {error ? <p className={styles.formError} role="alert">{error}</p> : null}
    <button type="submit" className={styles.primaryButton} disabled={pending}>{pending ? "Updating…" : "Set new password"}</button>
  </form>;
}
