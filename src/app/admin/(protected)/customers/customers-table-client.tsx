"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCustomerLead } from "@/lib/supabase-admin";
import {
  bulkDeleteCustomerLeadsAction,
  deleteCustomerLeadAction,
  updateCustomerLeadStatusAction,
} from "../../actions";
import { ConfirmedDeleteForm } from "../confirmed-delete-form";
import { CustomerLeadStatusForm } from "./customer-lead-status-form";
import styles from "../../admin.module.css";

type CustomersTableClientProps = {
  leads: AdminCustomerLead[];
};

export function CustomersTableClient({ leads }: CustomersTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < leads.length;
  const requiresTypeToConfirm = selectedIds.size >= 5;
  const canConfirm = !requiresTypeToConfirm || confirmInput.trim() === "DELETE";

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirmBulkDelete() {
    setModalError(null);
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0 || !canConfirm) return;

    startTransition(async () => {
      try {
        const outcome = await bulkDeleteCustomerLeadsAction(idsToDelete);

        if (!outcome.success && outcome.total === outcome.failedCount) {
          setModalError(
            outcome.error || "Could not delete selected customer contacts. Please try again."
          );
          return;
        }

        const messages: string[] = [];
        if (outcome.deletedCount > 0) {
          messages.push(
            `${outcome.deletedCount} customer ${
              outcome.deletedCount === 1 ? "contact" : "contacts"
            } deleted successfully.`
          );
        }
        if (outcome.failedCount > 0) {
          messages.push(`${outcome.failedCount} contacts could not be removed.`);
        }

        setFeedback({
          type: outcome.failedCount > 0 ? "error" : "success",
          message: messages.join(" "),
        });

        // Clear successfully removed leads
        const successfulIds = new Set(
          outcome.results.filter((r) => r.success).map((r) => r.id)
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of successfulIds) {
            next.delete(id);
          }
          return next;
        });

        setShowDeleteModal(false);
        setConfirmInput("");
        router.refresh();
      } catch (err) {
        console.error("[CustomersTableClient] Bulk delete error:", err);
        setModalError("An unexpected server error occurred during bulk deletion.");
      }
    });
  }

  if (leads.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>No customer leads found</h2>
        <p>
          Numbers submitted through the public welcome popup will appear here securely under database RLS.
        </p>
      </div>
    );
  }

  return (
    <>
      {feedback && (
        <div
          className={`${styles.toastBanner} ${
            feedback.type === "success" ? styles.toastSuccess : styles.toastError
          }`}
          role="status"
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setFeedback(null)}
            style={{ fontSize: "12px", color: "inherit" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: "44px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  aria-label="Select all customer leads on this page"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={toggleSelectAll}
                  className={styles.rowCheckbox}
                />
              </th>
              <th scope="col">WhatsApp Number</th>
              <th scope="col">Registered Date</th>
              <th scope="col">Marketing Consent</th>
              <th scope="col">Showroom Group Status</th>
              <th scope="col" style={{ textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const isSelected = selectedIds.has(lead.id);
              const cleanPhone = lead.whatsapp_number.replace(/[^0-9]/g, "");

              return (
                <tr
                  key={lead.id}
                  style={isSelected ? { backgroundColor: "#f0f7f4" } : undefined}
                >
                  <td style={{ textAlign: "center", width: "44px" }}>
                    <input
                      type="checkbox"
                      aria-label={`Select customer ${lead.whatsapp_number}`}
                      checked={isSelected}
                      onChange={() => toggleSelectOne(lead.id)}
                      className={styles.rowCheckbox}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontFamily: "monospace",
                          fontSize: "14px",
                        }}
                      >
                        {lead.whatsapp_number}
                      </span>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.tableLink}
                          style={{ fontSize: "11.5px" }}
                          title="Open WhatsApp chat"
                        >
                          Chat ↗
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "#687774", fontSize: "13px" }}>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(lead.created_at))}
                  </td>
                  <td>
                    {lead.marketing_consent ? (
                      <span className={styles.status} data-status="active">
                        Opted In
                      </span>
                    ) : (
                      <span className={styles.status} data-status="inactive">
                        Not Opted In
                      </span>
                    )}
                  </td>
                  <td>
                    {lead.marketing_status === "opted_out" ? (
                      <span className={styles.status} data-status="archived">
                        Opted Out
                      </span>
                    ) : (
                      <CustomerLeadStatusForm
                        id={lead.id}
                        status={lead.marketing_status}
                        hasMarketingConsent={lead.marketing_consent}
                        whatsappNumber={lead.whatsapp_number}
                      />
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className={styles.inlineDelete} style={{ justifyContent: "flex-end" }}>
                      {lead.marketing_status !== "opted_out" && lead.marketing_consent ? (
                        <form action={updateCustomerLeadStatusAction}>
                          <input type="hidden" name="id" value={lead.id} />
                          <input type="hidden" name="status" value="opted_out" />
                          <button
                            className={styles.secondaryButton}
                            type="submit"
                            style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px" }}
                          >
                            Opt out
                          </button>
                        </form>
                      ) : null}
                      <ConfirmedDeleteForm
                        action={deleteCustomerLeadAction}
                        id={lead.id}
                        confirmationMessage={`Delete lead ${lead.whatsapp_number}? This cannot be undone.`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contextual Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <aside className={styles.bulkActionBar} role="region" aria-label="Bulk actions">
          <div className={styles.bulkActionInfo}>
            <span className={styles.bulkBadge}>{selectedIds.size}</span>
            <span>
              {selectedIds.size === 1 ? "contact" : "contacts"} selected
            </span>
          </div>
          <div className={styles.bulkActionButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSelectedIds(new Set())}
              style={{ minHeight: "34px", padding: "5px 12px", fontSize: "12.5px" }}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.bulkDangerButton}
              onClick={() => {
                setConfirmInput("");
                setModalError(null);
                setShowDeleteModal(true);
              }}
              id="bulk-delete-customers-trigger"
            >
              Delete Selected
            </button>
          </div>
        </aside>
      )}

      {/* Confirmation Dialog */}
      {showDeleteModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-customer-modal-title"
        >
          <div className={styles.modalCard}>
            <h3 id="bulk-customer-modal-title" className={styles.modalTitle}>
              Delete {selectedIds.size} selected customer {selectedIds.size === 1 ? "contact" : "contacts"}?
            </h3>
            <p className={styles.modalDescription}>
              These customers will be removed from your contact list. This action cannot be undone through the admin portal.
            </p>

            {requiresTypeToConfirm && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="confirm-delete-input"
                  style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#141c1b", marginBottom: "6px" }}
                >
                  Type <code>DELETE</code> to confirm bulk removal:
                </label>
                <input
                  id="confirm-delete-input"
                  type="text"
                  className={styles.modalInput}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
              </div>
            )}

            {modalError && (
              <p className={styles.formError} role="alert" style={{ margin: "0 0 16px" }}>
                {modalError}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmInput("");
                  setModalError(null);
                }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleConfirmBulkDelete}
                disabled={isPending || !canConfirm}
                id="bulk-delete-customers-confirm"
              >
                {isPending
                  ? "Deleting…"
                  : `Delete ${selectedIds.size} ${
                      selectedIds.size === 1 ? "Contact" : "Contacts"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
