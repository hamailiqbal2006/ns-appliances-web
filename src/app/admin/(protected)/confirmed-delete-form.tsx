"use client";

import { useState, useRef } from "react";
import styles from "../admin.module.css";
import { ConfirmationModal } from "./confirmation-modal";

type ConfirmedDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  confirmationMessage: string;
  label?: string;
  title?: string;
};

/**
 * Keeps destructive-action confirmation in the browser with an accessible
 * custom confirmation dialog while preserving the server action passed
 * from the surrounding server-rendered admin page.
 */
export function ConfirmedDeleteForm({
  action,
  id,
  confirmationMessage,
  label = "Delete",
  title,
}: ConfirmedDeleteFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleTriggerClick(e: React.MouseEvent) {
    e.preventDefault();
    setIsOpen(true);
  }

  function handleConfirm() {
    setIsOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          className={styles.dangerButton}
          type="button"
          onClick={handleTriggerClick}
          title={title}
          style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px" }}
        >
          {label}
        </button>
      </form>

      <ConfirmationModal
        isOpen={isOpen}
        title={title || "Confirm Deletion"}
        message={confirmationMessage}
        confirmLabel={label}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}
