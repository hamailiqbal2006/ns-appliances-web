"use client";

import { useActionState } from "react";
import { saveCustomerLeadStatusAction } from "../../actions";
import type { CustomerLeadStatus } from "@/lib/supabase-admin";
import styles from "../../admin.module.css";

const editableStatuses: CustomerLeadStatus[] = ["none", "invited", "added"];

type CustomerLeadStatusFormProps = {
  id: string;
  status: CustomerLeadStatus;
  hasMarketingConsent: boolean;
  whatsappNumber: string;
};

export function CustomerLeadStatusForm({
  id,
  status,
  hasMarketingConsent,
  whatsappNumber,
}: CustomerLeadStatusFormProps) {
  const [state, action, pending] = useActionState(saveCustomerLeadStatusAction, { error: null });

  if (!hasMarketingConsent) {
    return (
      <span
        className={styles.status}
        data-status="inactive"
        title="Marketing consent is required before this contact can be marked as invited or added."
      >
        No consent
      </span>
    );
  }

  return (
    <form action={action} className={styles.inlineDelete}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        aria-label={`Manual status for ${whatsappNumber}`}
        disabled={pending}
        style={{
          padding: "4px 8px",
          fontSize: "12.5px",
          borderRadius: "6px",
          border: "1px solid #ccd5d1",
          background: "#fff",
        }}
      >
        {editableStatuses.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
      <button
        className={styles.secondaryButton}
        type="submit"
        disabled={pending}
        style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px" }}
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error ? (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
