"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import styles from "../admin.module.css";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <form className={styles.loginForm} action={formAction} noValidate>
      <input type="hidden" name="next" value={next} />
      <label>
        Email address
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className={styles.formError} role="alert">{state.error}</p> : null}
      <button className={styles.primaryButton} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Link className={styles.textButton} href="/admin/forgot-password">Forgot your password?</Link>
    </form>
  );
}
