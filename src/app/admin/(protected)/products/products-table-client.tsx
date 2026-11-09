/* eslint-disable @next/next/no-img-element -- Supabase project host is configured by the owner at deployment time. */
"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CategoryRecord } from "@/lib/category-types";
import { bulkDeleteProductsAction, saveCategoryProductOrderAction } from "../../actions";
import styles from "../../admin.module.css";

export type ProductRowViewModel = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  subcategorySlug?: string | null;
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
  categories?: CategoryRecord[];
  categoryOrders?: Record<string, string[]>;
};

function sortCategoryProducts(
  items: ProductRowViewModel[],
  orderArray: string[] | undefined,
): ProductRowViewModel[] {
  if (!orderArray || orderArray.length === 0) return items;
  const orderMap = new Map<string, number>();
  orderArray.forEach((id, idx) => orderMap.set(id, idx));

  return [...items].sort((a, b) => {
    const posA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const posB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    if (posA !== posB) return posA - posB;
    return 0;
  });
}

export function ProductsTableClient({
  products,
  categories = [],
  categoryOrders = {},
}: ProductsTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Category Filtering & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Category Manual Ordering State
  const [categoryList, setCategoryList] = useState<ProductRowViewModel[]>([]);
  const [orderDirty, setOrderDirty] = useState<boolean>(false);
  const [savingOrder, setSavingOrder] = useState<boolean>(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.categorySlug] = (counts[p.categorySlug] || 0) + 1;
    }
    return counts;
  }, [products]);

  const handleCategoryChange = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    if (nextCategory !== "all") {
      const filtered = products.filter((p) => p.categorySlug === nextCategory);
      const ordered = sortCategoryProducts(filtered, categoryOrders[nextCategory]);
      setCategoryList(ordered);
    } else {
      setCategoryList([]);
    }
    setOrderDirty(false);
  };

  // Determine displayed items
  const displayedProducts = useMemo(() => {
    let list: ProductRowViewModel[];
    if (selectedCategory === "all") {
      list = products;
    } else {
      list = categoryList;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q),
    );
  }, [selectedCategory, products, categoryList, searchQuery]);

  const allSelected =
    displayedProducts.length > 0 && selectedIds.size === displayedProducts.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < displayedProducts.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedProducts.map((p) => p.id)));
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

  // Manual reordering handlers
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || searchActive) return;
    setCategoryList((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    setOrderDirty(true);
  };

  const handleMoveEarlier = (index: number) => {
    if (index <= 0 || searchActive) return;
    handleReorder(index, index - 1);
  };

  const handleMoveLater = (index: number) => {
    if (index >= categoryList.length - 1 || searchActive) return;
    handleReorder(index, index + 1);
  };

  const handleSaveOrder = async () => {
    if (selectedCategory === "all" || !orderDirty) return;
    setSavingOrder(true);
    try {
      const orderedIds = categoryList.map((p) => p.id);
      const res = await saveCategoryProductOrderAction(selectedCategory, orderedIds);
      if (res.ok) {
        setOrderDirty(false);
        const catObj = categories.find((c) => c.slug === selectedCategory);
        setFeedback({
          type: "success",
          message: `Product display order for ${catObj?.name || selectedCategory} saved successfully.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to save category product order.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error saving category order.",
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRevertOrder = () => {
    if (selectedCategory === "all") return;
    const filtered = products.filter((p) => p.categorySlug === selectedCategory);
    const ordered = sortCategoryProducts(filtered, categoryOrders[selectedCategory]);
    setCategoryList(ordered);
    setOrderDirty(false);
  };

  function handleConfirmBulkDelete() {
    setModalError(null);
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    startTransition(async () => {
      try {
        const outcome = await bulkDeleteProductsAction(idsToDelete);

        if (!outcome.success && outcome.total === outcome.failedCount) {
          setModalError(
            outcome.error || "Could not delete selected products. Please try again.",
          );
          return;
        }

        const messages: string[] = [];
        if (outcome.deletedCount > 0) {
          messages.push(
            `${outcome.deletedCount} ${
              outcome.deletedCount === 1 ? "product" : "products"
            } permanently deleted.`,
          );
        }
        if (outcome.failedCount > 0) {
          messages.push(`${outcome.failedCount} failed to remove.`);
        }

        setFeedback({
          type: outcome.failedCount > 0 ? "error" : "success",
          message: messages.join(" "),
        });

        const successfulIds = new Set(
          outcome.results
            .filter((r) => r.action === "deleted")
            .map((r) => r.id),
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

  const isReorderMode = selectedCategory !== "all";
  const searchActive = searchQuery.trim().length > 0;
  const currentCategoryObj = categories.find((c) => c.slug === selectedCategory);

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

      {/* Filter and Search Bar */}
      <div className={styles.filterRow} style={{ marginTop: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          <label htmlFor="product-category-filter" style={{ fontSize: "13px", fontWeight: 600, color: "var(--admin-text-secondary)" }}>
            Category:
          </label>
          <select
            id="product-category-filter"
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({categoryCounts[c.slug] || 0})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.searchBar}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by name, model or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter products"
          />
        </div>
      </div>

      {/* Category Reordering Bar (visible when a specific category is chosen) */}
      {isReorderMode && (
        <div className={styles.reorderNoticeBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600 }}>{currentCategoryObj?.name || selectedCategory}</span>
            <span style={{ color: "var(--admin-text-secondary)" }}>
              ({categoryList.length} {categoryList.length === 1 ? "product" : "products"})
            </span>
            {searchActive ? (
              <span style={{ color: "var(--admin-text-muted)", fontSize: "12px", fontStyle: "italic" }}>
                — Clear search to reorder
              </span>
            ) : (
              <span style={{ color: "var(--admin-text-muted)", fontSize: "12px" }}>
                — Drag rows or use ↑ / ↓ buttons to set storefront order
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {orderDirty && (
              <>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleRevertOrder}
                  disabled={savingOrder}
                  style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12.5px" }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveOrder}
                  disabled={savingOrder}
                  style={{ minHeight: "32px", padding: "4px 14px", fontSize: "12.5px" }}
                >
                  {savingOrder ? "Saving..." : "Save Category Order"}
                </button>
              </>
            )}
            {!orderDirty && (
              <span style={{ fontSize: "12px", color: "var(--admin-accent)" }}>
                ✓ Storefront order saved
              </span>
            )}
          </div>
        </div>
      )}

      {displayedProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No matching products</h2>
          <p>
            {searchQuery
              ? `No products found matching "${searchQuery}".`
              : "No products exist under the selected category."}
          </p>
          {searchQuery && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col" className={styles.colCheckbox}>
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
                <th scope="col" className={styles.colOrder}>
                  Order
                </th>
                <th scope="col" className={styles.colProduct}>
                  Product
                </th>
                <th scope="col" className={styles.colCategory}>
                  Category
                </th>
                <th scope="col" className={styles.colPrice}>
                  Price
                </th>
                <th scope="col" className={styles.colVisibility}>
                  Visibility
                </th>
                <th scope="col" className={styles.colAvailability}>
                  Availability
                </th>
                <th scope="col" className={styles.colStock}>
                  Stock
                </th>
                <th scope="col" className={styles.colUpdated}>
                  Updated
                </th>
                <th scope="col" className={styles.colActions}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((product, idx) => {
                const isSelected = selectedIds.has(product.id);
                const isDragged = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx;

                return (
                  <tr
                    key={product.id}
                    className={`${isDragOver ? styles.trDragOver : ""}`}
                    style={{
                      ...(isSelected ? { backgroundColor: "var(--admin-primary-light)" } : {}),
                      opacity: isDragged ? 0.4 : 1,
                    }}
                    onDragOver={(e) => {
                      if (!isReorderMode || searchActive) return;
                      e.preventDefault();
                      if (dragOverIdx !== idx) setDragOverIdx(idx);
                    }}
                    onDragLeave={() => {
                      if (!isReorderMode || searchActive) return;
                      if (dragOverIdx === idx) setDragOverIdx(null);
                    }}
                    onDrop={(e) => {
                      if (!isReorderMode || searchActive) return;
                      e.preventDefault();
                      if (dragOverIdx !== idx) setDragOverIdx(null);
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        handleReorder(draggedIdx, idx);
                      }
                      setDraggedIdx(null);
                    }}
                  >
                    {/* 1. Selection checkbox */}
                    <td className={styles.colCheckbox}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(product.id)}
                        className={styles.rowCheckbox}
                      />
                    </td>

                    {/* 2. Product order */}
                    <td className={styles.colOrder}>
                      {isReorderMode ? (
                        <div className={styles.orderControlGroup}>
                          <span
                            className={styles.dragHandle}
                            draggable={!searchActive}
                            onDragStart={(e) => {
                              if (searchActive) return;
                              setDraggedIdx(idx);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDraggedIdx(null);
                              setDragOverIdx(null);
                            }}
                            title="Drag row to reorder"
                            aria-label={`Drag to reorder ${product.name}`}
                            style={{ cursor: searchActive ? "not-allowed" : "grab" }}
                          >
                            ⠿
                          </span>
                          <span className={styles.orderRankBadge}>#{idx + 1}</span>
                          <div className={styles.reorderButtons}>
                            <button
                              type="button"
                              className={styles.orderMoveBtn}
                              onClick={() => handleMoveEarlier(idx)}
                              disabled={idx === 0 || searchActive}
                              title="Move earlier"
                              aria-label={`Move ${product.name} earlier`}
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M8 3.293l5.354 5.353a.5.5 0 01-.708.708L8 4.707 3.354 9.354a.5.5 0 11-.708-.708L8 3.293z" clipRule="evenodd"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={styles.orderMoveBtn}
                              onClick={() => handleMoveLater(idx)}
                              disabled={idx === displayedProducts.length - 1 || searchActive}
                              title="Move later"
                              aria-label={`Move ${product.name} later`}
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M8 12.707l-5.354-5.353a.5.5 0 01.708-.708L8 11.293l4.646-4.646a.5.5 0 01.708.708L8 12.707z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.orderMutedCell} title="Filter by category to adjust display order">
                          <span className={styles.orderRankMuted}>—</span>
                        </div>
                      )}
                    </td>

                    {/* 3. Product image and name */}
                    <td className={styles.colProduct}>
                      <div className={styles.productCell}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className={styles.productCellImg} />
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

                    {/* 4. Category / subcategory */}
                    <td className={styles.colCategory}>
                      <div className={styles.categoryCell}>
                        <span className={styles.categoryCellName}>
                          {product.categoryName}
                        </span>
                        {product.subcategoryName ? (
                          <span className={styles.subcategoryCellName}>
                            {product.subcategoryName}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* 5. Price */}
                    <td className={styles.colPrice}>
                      {product.priceFormatted ? (
                        <span className={styles.priceCellText}>
                          PKR {product.priceFormatted}
                        </span>
                      ) : (
                        <span className={styles.inquiryCellText}>
                          Showroom inquiry
                        </span>
                      )}
                    </td>

                    {/* 6. Visibility */}
                    <td className={styles.colVisibility}>
                      <span className={styles.statusDotLabel}>
                        <span
                          className={`${styles.statusDot} ${
                            product.status === "active"
                              ? styles.statusDotActive
                              : product.status === "archived"
                              ? styles.statusDotDraft
                              : styles.statusDotWarning
                          }`}
                          aria-hidden
                        />
                        {product.status === "active"
                          ? "Active"
                          : product.status === "archived"
                          ? "Archived"
                          : "Draft"}
                      </span>
                    </td>

                    {/* 7. Availability */}
                    <td className={styles.colAvailability}>
                      <span
                        className={styles.availabilityBadge}
                        data-availability={product.availabilityStatus}
                      >
                        {product.availabilityBadgeLabel}
                      </span>
                    </td>

                    {/* 8. Stock */}
                    <td className={styles.colStock}>
                      <span className={styles.stockCellText}>
                        {product.stockFormatted}
                      </span>
                    </td>

                    {/* 9. Last updated */}
                    <td className={styles.colUpdated}>
                      <span className={styles.updatedCellText}>
                        {product.updatedFormatted}
                      </span>
                    </td>

                    {/* 10. Actions */}
                    <td className={styles.colActions}>
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
      )}

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
