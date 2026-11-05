import styles from "../admin.module.css";

export default function AdminLoading() {
  return (
    <div className={styles.statusPanel} role="status" aria-live="polite">
      <p className={styles.kicker}>NS Admin</p>
      <h1>Loading protected data…</h1>
      <p>Please wait while the current admin session is checked.</p>
    </div>
  );
}
