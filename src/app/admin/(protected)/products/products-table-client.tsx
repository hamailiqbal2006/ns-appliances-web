/* eslint-disable @next/next/no-img-element -- Supabase project host is configured by the owner at deployment time. */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkDeleteProductsAction } from "../../actions";
import styles from "../../admin.module.css";

export type ProductRowViewModel = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  categoryName: string;
  subcategoryName: string | null;
  priceFormatted: string | null;
  status: "draft" | "active" | "archived";
  availabilityStatus: string;
  availabilityBadgeLabel: string;
  stockFormatted: string;
  updatedFormatted: string;
};

type ProductsTableClientProps = {
  products: ProductRowViewModel[];
};

export function ProductsTableClient({ products }: ProductsTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected =
    products.length > 0 && selectedIds.size === products.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < products.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
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
    if (idsToDelete.length === 0) return;

    startTransition(async () => {
      try {
        const outcome = await bulkDeleteProductsAction(idsToDelete);

        if (!outcome.success && outcome.total === outcome.failedCount) {
          setModalError(
            outcome.error || "Could not delete selected products. Please try again."
          );
          return;
        }

        // Build informative user summary
        const messages: string[] = [];
        if (outcome.deletedCount > 0) {
          messages.push(
            `${outcome.deletedCount} ${
              outcome.deletedCount === 1 ? "product" : "products"
            } permanently deleted.`
          );
        }
        if (outcome.failedCount > 0) {
          messages.push(`${outcome.failedCount} failed to remove.`);
        }

        setFeedback({
          type: outcome.failedCount > 0 ? "error" : "success",
          message: messages.join(" "),
        });

        // Clear successfully removed selections
        const successfulIds = new Set(
          outcome.results
            .filter((r) => r.action === "deleted")
            .map((r) => r.id)
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of successfulIds) {
            next.delete(id);
          }
          return next;
        });

        setShowDeleteModal(false);
        router.refresh();
      } catch (err) {
        console.error("[ProductsTableClient] Bulk delete error:", err);
        setModalError("An unexpected server error occurred during bulk deletion.");
      }
    });
  }

  if (products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>No admin products yet</h2>
        <p>
          Active records are automatically published to the customer website; drafts and archived
          records stay private under database RLS.
        </p>
        <Link href="/admin/products/new" className={styles.primaryButton}>
          Add first product
        </Link>
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
                  aria-label="Select all on this page"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={toggleSelectAll}
                  className={styles.rowCheckbox}
                />
              </th>
              <th scope="col" style={{ width: "30%" }}>
                Product
              </th>
              <th scope="col">Category</th>
              <th scope="col">Price</th>
              <th scope="col">Visibility</th>
              <th scope="col">Availability</th>
              <th scope="col">Stock</th>
              <th scope="col">Updated</th>
              <th scope="col" style={{ textAlign: "right" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id);

              return (
                <tr
                  key={product.id}
                  style={isSelected ? { backgroundColor: "#f0f7f4" } : undefined}
                >
                  <td style={{ textAlign: "center", width: "44px" }}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={isSelected}
                      onChange={() => toggleSelectOne(product.id)}
                      className={styles.rowCheckbox}
                    />
                  </td>
                  <td>
                    <div className={styles.productCell}>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" />
                      ) : (
                        <span className={styles.imageDot} aria-hidden />
                      )}
                      <div className={styles.productCellText}>
                        <strong className={styles.productCellName}>{product.name}</strong>
                        <span className={styles.productCellSlug}>
                          <code>{product.slug}</code>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#141c1b" }}>{product.categoryName}</span>
                    {product.subcategoryName ? (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#687774",
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        {product.subcategoryName}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {product.priceFormatted ? (
                      <span style={{ fontWeight: 600, color: "#141c1b" }}>
                        PKR {product.priceFormatted}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca6a2", fontStyle: "italic" }}>
                        Showroom inquiry
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={styles.status} data-status={product.status}>
                      {product.status === "active" ? "Active" : product.status === "archived" ? "Archived" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <span className={styles.availabilityBadge} data-availability={product.availabilityStatus}>
                      {product.availabilityBadgeLabel}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, fontSize: "12.5px" }}>
                      {product.stockFormatted}
                    </span>
                  </td>
                  <td style={{ color: "#687774", fontSize: "12.5px" }}>
                    {product.updatedFormatted}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "5px 12px", fontSize: "12.5px" }}
                    >
                      Edit
                    </Link>
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
              {selectedIds.size === 1 ? "product" : "products"} selected
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
              onClick={() => setShowDeleteModal(true)}
              id="bulk-delete-products-trigger"
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
          aria-labelledby="bulk-product-modal-title"
        >
          <div className={styles.modalCard}>
            <h3 id="bulk-product-modal-title" className={styles.modalTitle}>
              Delete {selectedIds.size} selected {selectedIds.size === 1 ? "product" : "products"}?
            </h3>
            <p className={styles.modalDescription}>
              This permanently removes the selected products. Reservation history is retained as
              immutable snapshots, and shared media is never removed.
            </p>

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
                disabled={isPending}
                id="bulk-delete-products-confirm"
              >
                {isPending
                  ? "Deleting…"
                  : `Delete ${selectedIds.size} ${
                      selectedIds.size === 1 ? "Product" : "Products"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
