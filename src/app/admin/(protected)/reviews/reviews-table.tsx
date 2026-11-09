"use client";

import { useState, useTransition, useId } from "react";
import Link from "next/link";
import type { AdminProductReview } from "@/lib/gallery-types";
import {
  moderateReviewAction,
  deleteReviewAction,
  bulkModerateReviewsAction,
  bulkDeleteReviewsAction,
} from "../../actions";
import { ConfirmationModal } from "../confirmation-modal";
import styles from "../../admin.module.css";

function formatSplitDate(iso: string): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: iso, timeStr: "" };
  }
}

export function ReviewsTable({
  reviews,
}: {
  reviews: AdminProductReview[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const selectAllId = useId();

  // Modal dialog state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    isDestructive: true,
    onConfirm: () => {},
  });

  const allVisibleSelected =
    reviews.length > 0 && reviews.every((r) => selectedIds.has(r.id));
  const someVisibleSelected =
    reviews.some((r) => selectedIds.has(r.id)) && !allVisibleSelected;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reviews.map((r) => r.id)));
    }
  }

  function toggleSelectRow(id: string) {
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

  function handleSingleApprove(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", "approved");
      await moderateReviewAction(fd);
    });
  }

  function handleSingleReject(id: string, customerName: string) {
    setModalConfig({
      isOpen: true,
      title: "Reject and Delete Review",
      message: `Reject and permanently delete customer review by "${customerName}"? This action cannot be undone.`,
      confirmLabel: "Reject Review",
      isDestructive: true,
      onConfirm: () => {
        setModalConfig((c) => ({ ...c, isOpen: false }));
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await deleteReviewAction(fd);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
      },
    });
  }

  function handleBulkApprove() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ids", JSON.stringify(ids));
      fd.set("status", "approved");
      await bulkModerateReviewsAction(fd);
      setSelectedIds(new Set());
    });
  }

  function handleBulkReject() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const count = ids.length;
    setModalConfig({
      isOpen: true,
      title: `Reject and Delete ${count} Review${count === 1 ? "" : "s"}`,
      message: `Reject and permanently delete ${count} selected customer review${
        count === 1 ? "" : "s"
      } from the database? This action cannot be undone.`,
      confirmLabel: `Reject ${count} Review${count === 1 ? "" : "s"}`,
      isDestructive: true,
      onConfirm: () => {
        setModalConfig((c) => ({ ...c, isOpen: false }));
        startTransition(async () => {
          const fd = new FormData();
          fd.set("ids", JSON.stringify(ids));
          await bulkDeleteReviewsAction(fd);
          setSelectedIds(new Set());
        });
      },
    });
  }

  return (
    <>
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className={styles.bulkToolbar} role="region" aria-label="Bulk review moderation actions">
          <div className={styles.bulkToolbarInfo}>
            <span className={styles.bulkToolbarCount}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {selectedIds.size} {selectedIds.size === 1 ? "review" : "reviews"} selected
            </span>
          </div>
          <div className={styles.bulkToolbarActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleBulkApprove}
              disabled={isPending}
              style={{ minHeight: "32px", padding: "4px 12px", fontSize: "12.5px" }}
            >
              Approve Selected
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleBulkReject}
              disabled={isPending}
              style={{ minHeight: "32px", padding: "4px 12px", fontSize: "12.5px" }}
            >
              Reject Selected
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSelectedIds(new Set())}
              disabled={isPending}
              style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12.5px" }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Desktop Balanced Table */}
      <div className={styles.reviewDesktopTable}>
        <div className={styles.tablePanel}>
          <div className={styles.tableWrap}>
            <table style={{ minWidth: "100%", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "44px" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "27%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "140px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "center", padding: "12px 8px" }}>
                    <input
                      id={selectAllId}
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected;
                      }}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible reviews"
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </th>
                  <th scope="col">Product</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Review Comment</th>
                  <th scope="col">Date</th>
                  <th scope="col" style={{ textAlign: "center" }}>Status</th>
                  <th scope="col" style={{ textAlign: "right", paddingRight: "16px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const isChecked = selectedIds.has(r.id);
                  const { dateStr, timeStr } = formatSplitDate(r.createdAt);
                  return (
                    <tr
                      key={r.id}
                      style={{
                        backgroundColor: isChecked ? "var(--admin-primary-light)" : undefined,
                      }}
                    >
                      <td style={{ textAlign: "center", padding: "12px 8px" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(r.id)}
                          aria-label={`Select review by ${r.customerName}`}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </td>
                      <td style={{ wordBreak: "break-word" }}>
                        {r.productSlug ? (
                          <Link
                            href={`/products/${r.productSlug}`}
                            target="_blank"
                            className={styles.tableLink}
                            style={{ fontWeight: 600, fontSize: "13px" }}
                          >
                            {r.productName || "View product ↗"}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--admin-text-primary)" }}>
                            {r.productName || "General showroom review"}
                          </span>
                        )}
                      </td>
                      <td style={{ wordBreak: "break-word" }}>
                        <div>
                          <strong style={{ color: "var(--admin-text-primary)", fontSize: "13px" }}>
                            {r.customerName}
                          </strong>
                          {r.customerEmail && (
                            <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginTop: "2px" }}>
                              {r.customerEmail}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "var(--admin-accent-text, #BBA17C)", fontSize: "13px", whiteSpace: "nowrap" }}>
                          ★ {Number(r.rating).toFixed(1)} / 5
                        </span>
                      </td>
                      <td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                        <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.5, color: "var(--admin-text-secondary)" }}>
                          {r.reviewText}
                        </p>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--admin-text-primary)" }}>
                          {dateStr}
                        </div>
                        {timeStr && (
                          <div style={{ fontSize: "11px", color: "var(--admin-text-muted)", marginTop: "1px" }}>
                            {timeStr}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <span className={styles.statusDotLabel} style={{ justifyContent: "center" }}>
                          <span
                            className={`${styles.statusDot} ${
                              r.status === "approved"
                                ? styles.statusDotActive
                                : r.status === "rejected"
                                ? styles.statusDotDanger
                                : styles.statusDotWarning
                            }`}
                            aria-hidden
                          />
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "16px", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            gap: "6px",
                            justifyContent: "flex-end",
                            alignItems: "center",
                          }}
                        >
                          {r.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleSingleApprove(r.id)}
                              disabled={isPending}
                              className={styles.primaryButton}
                              style={{
                                minHeight: "28px",
                                padding: "3px 10px",
                                fontSize: "12px",
                              }}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSingleReject(r.id, r.customerName)}
                            disabled={isPending}
                            className={styles.dangerButton}
                            style={{
                              minHeight: "28px",
                              padding: "3px 10px",
                              fontSize: "12px",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Review Cards */}
      <div className={styles.reviewCardList}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--admin-text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected;
              }}
              onChange={toggleSelectAll}
              style={{ width: "16px", height: "16px" }}
            />
            Select All ({reviews.length})
          </label>
        </div>

        {reviews.map((r) => {
          const isChecked = selectedIds.has(r.id);
          const { dateStr, timeStr } = formatSplitDate(r.createdAt);
          return (
            <article
              key={r.id}
              className={`${styles.reviewCard} ${isChecked ? styles.reviewCardSelected : ""}`}
            >
              <div className={styles.reviewCardHeader}>
                <label className={styles.reviewCardCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelectRow(r.id)}
                    style={{ width: "18px", height: "18px", marginTop: "2px", flexShrink: 0 }}
                    aria-label={`Select review by ${r.customerName}`}
                  />
                  <div>
                    {r.productSlug ? (
                      <Link
                        href={`/products/${r.productSlug}`}
                        target="_blank"
                        className={styles.tableLink}
                        style={{ fontWeight: 700, fontSize: "14px" }}
                      >
                        {r.productName || "View product ↗"}
                      </Link>
                    ) : (
                      <strong style={{ fontSize: "14px", color: "var(--admin-text-primary)" }}>
                        {r.productName || "General Showroom Review"}
                      </strong>
                    )}
                    <div style={{ fontSize: "12.5px", color: "var(--admin-text-secondary)", marginTop: "2px" }}>
                      by <strong>{r.customerName}</strong>
                      {r.customerEmail && <span> &middot; {r.customerEmail}</span>}
                    </div>
                  </div>
                </label>
                <span className={styles.statusDotLabel}>
                  <span
                    className={`${styles.statusDot} ${
                      r.status === "approved"
                        ? styles.statusDotActive
                        : r.status === "rejected"
                        ? styles.statusDotDanger
                        : styles.statusDotWarning
                    }`}
                    aria-hidden
                  />
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: "var(--admin-accent-text, #BBA17C)", fontSize: "13px" }}>
                  ★ {Number(r.rating).toFixed(1)} / 5.0
                </span>
                <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.5, color: "var(--admin-text-primary)" }}>
                  {r.reviewText}
                </p>
              </div>

              <div className={styles.reviewCardMeta}>
                <span>
                  Submitted {dateStr} {timeStr && `at ${timeStr}`}
                </span>
                <div className={styles.reviewCardActions} style={{ borderTop: "none", padding: 0 }}>
                  {r.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => handleSingleApprove(r.id)}
                      disabled={isPending}
                      className={styles.primaryButton}
                      style={{ minHeight: "30px", padding: "4px 12px", fontSize: "12px" }}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSingleReject(r.id, r.customerName)}
                    disabled={isPending}
                    className={styles.dangerButton}
                    style={{ minHeight: "30px", padding: "4px 12px", fontSize: "12px" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel="Cancel"
        isDestructive={modalConfig.isDestructive}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((c) => ({ ...c, isOpen: false }))}
      />
    </>
  );
}

