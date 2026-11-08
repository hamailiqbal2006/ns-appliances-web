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
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@nshomeappliances.com"
          required
          disabled={pending}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          required
          disabled={pending}
        />
      </label>

      {state.error ? (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      ) : null}

      <button className={styles.primaryButton} type="submit" disabled={pending}>
        {pending ? (
          <>
            <svg
              className={styles.buttonSpinner}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Signing in…</span>
          </>
        ) : (
          <span>Sign In</span>
        )}
      </button>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "4px" }}>
        <Link className={styles.textButton} href="/admin/forgot-password">
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
