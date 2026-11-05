"use client";

import { useEffect } from "react";
import styles from "../admin.module.css";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin route failed to load", error);
  }, [error]);

  return (
    <section className={styles.statusPanel} role="alert">
      <p className={styles.kicker}>NS Admin</p>
      <h1>We could not load this admin page.</h1>
      <p>Your data was not changed. Check the Supabase connection and your approved admin access, then try again.</p>
      <button type="button" className={styles.primaryButton} onClick={reset}>Try again</button>
    </section>
  );
}
