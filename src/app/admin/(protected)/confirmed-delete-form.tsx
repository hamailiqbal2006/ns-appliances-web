"use client";

import type { FormEvent } from "react";
import styles from "../admin.module.css";

type ConfirmedDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  confirmationMessage: string;
  label?: string;
  title?: string;
};

/**
 * Keeps destructive-action confirmation in the browser while preserving the
 * server action passed from the surrounding server-rendered admin page.
 */
export function ConfirmedDeleteForm({
  action,
  id,
  confirmationMessage,
  label = "Delete",
  title,
}: ConfirmedDeleteFormProps) {
  function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmationMessage)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmDeletion}>
      <input type="hidden" name="id" value={id} />
      <button
        className={styles.dangerButton}
        type="submit"
        title={title}
        style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px" }}
      >
        {label}
      </button>
    </form>
  );
}
