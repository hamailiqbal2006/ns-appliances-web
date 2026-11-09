"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "../admin.module.css";

export type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      style={{ zIndex: 1100 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        style={{
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          {isDestructive ? (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "var(--admin-danger-bg)",
                border: "1px solid var(--admin-danger-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--admin-danger)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          ) : (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "var(--admin-primary-light)",
                border: "1px solid var(--admin-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--admin-primary)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="confirm-modal-title" className={styles.modalTitle} style={{ marginTop: 0 }}>
              {title}
            </h2>
            <div id="confirm-modal-desc" className={styles.modalDescription}>
              {message}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            ref={cancelBtnRef}
            type="button"
            className={styles.secondaryButton}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={isDestructive ? styles.dangerButton : styles.primaryButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

