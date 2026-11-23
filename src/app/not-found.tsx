import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}>NS Home Appliances</Link>
      <section className={styles.content} aria-labelledby="not-found-heading">
        <div className={styles.code} aria-hidden="true">404</div>
        <h1 id="not-found-heading">Page not found.</h1>
        <p>The page you&apos;re looking for may have moved or is no longer available.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/">Back to Home</Link>
          <Link className={styles.secondary} href="/products">Browse Products</Link>
        </div>
      </section>
    </main>
  );
}
