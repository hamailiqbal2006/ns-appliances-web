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
      <p>We could not confirm whether your last changes were saved. Try again and check the saved values before repeating your changes. If the issue continues, sign in again or contact support.</p>
      {error.digest && <p>Reference: {error.digest}</p>}
      <button type="button" className={styles.primaryButton} onClick={reset}>Try again</button>
    </section>
  );
}
