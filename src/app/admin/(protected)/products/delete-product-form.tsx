"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSingleProductAction } from "../../actions";
import styles from "../../admin.module.css";

export function DeleteProductForm({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const outcome = await deleteSingleProductAction(id);
        if (!outcome.success) {
          setError(outcome.error || "Could not delete this product. Please try again.");
          return;
        }

        setNotice(outcome.message || "Product permanently deleted.");
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 1200);
      } catch (err) {
        console.error("[DeleteProductForm] Unexpected error:", err);
        setError("An unexpected error occurred while deleting the product.");
      }
    });
  }

  if (notice) {
    return (
      <div className={styles.toastSuccess} style={{ fontSize: "12.5px", padding: "6px 12px" }}>
        <span>{notice}</span>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className={styles.inlineDelete} style={{ flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12.5px", color: "#687774" }}>Permanently delete this product?</span>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={handleDelete}
            disabled={isPending}
            style={{ minHeight: "32px", padding: "4px 12px", fontSize: "12px" }}
          >
            {isPending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className={styles.formError} role="alert" style={{ margin: "4px 0 0", fontSize: "12px" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.dangerButton}
      onClick={() => setConfirming(true)}
      style={{ minHeight: "36px", padding: "6px 14px", fontSize: "13px" }}
    >
      Delete product
    </button>
  );
}
