/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type CategoryShowcaseItem,
  resolveCssBackground,
  getRecommendedTextColor,
} from "@/lib/category-showcase";
import { saveCategoryShowcaseAction } from "../../actions";
import styles from "../../admin.module.css";

interface EditorCategoryItem extends CategoryShowcaseItem {
  pendingFile: File | null;
  pendingPreviewUrl: string | null;
  removeImage: boolean;
}

function prepareItems(items: CategoryShowcaseItem[]): EditorCategoryItem[] {
  return items.map((item) => ({
    ...item,
    pendingFile: null,
    pendingPreviewUrl: null,
    removeImage: false,
  }));
}

function computeSnapshot(items: EditorCategoryItem[]): string {
  return JSON.stringify(
    items.map((it) => ({
      categorySlug: it.categorySlug,
      displayHeading: it.displayHeading,
      sortOrder: it.sortOrder,
      leftBgType: it.leftBgType,
      leftBgColor: it.leftBgColor,
      leftGradientEnd: it.leftGradientEnd,
      leftGradientAngle: it.leftGradientAngle,
      rightBgType: it.rightBgType,
      rightBgColor: it.rightBgColor,
      rightGradientEnd: it.rightGradientEnd,
      rightGradientAngle: it.rightGradientAngle,
      imagePath: it.imagePath,
      imageScale: it.imageScale,
      imageX: it.imageX,
      imageY: it.imageY,
      removeImage: it.removeImage,
    })),
  );
}

export function CategoryShowcaseForm({
  initialItems,
  isDatabaseReady,
}: {
  initialItems: CategoryShowcaseItem[];
  isDatabaseReady: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(saveCategoryShowcaseAction, { error: null });

  const [items, setItems] = useState<EditorCategoryItem[]>(() => prepareItems(initialItems));
  const initialSnapshot = useMemo(() => computeSnapshot(prepareItems(initialItems)), [initialItems]);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [fileError, setFileError] = useState<string | null>(null);

  // Drag and drop ordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeItem = useMemo(() => items.find((it) => it.categorySlug === activeSlug) ?? null, [items, activeSlug]);

  const isDirty = useMemo(() => {
    const currentSnapshot = computeSnapshot(items);
    const hasPendingFiles = items.some((it) => it.pendingFile !== null || it.removeImage);
    return currentSnapshot !== initialSnapshot || hasPendingFiles;
  }, [items, initialSnapshot]);

  // Window beforeunload prompt when unsaved changes exist
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Refresh server state when save succeeds
  useEffect(() => {
    if (state.success && !pending) {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [state.success, pending, router]);

  // Reorder helpers
  const moveItem = (index: number, direction: -1 | 1) => {
    const dest = index + direction;
    if (dest < 0 || dest >= items.length) return;
    setItems((curr) => {
      const next = [...curr];
      const temp = next[index];
      next[index] = next[dest];
      next[dest] = temp;
      return next.map((it, idx) => ({ ...it, sortOrder: idx }));
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setItems((curr) => {
      const next = [...curr];
      const [removed] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, removed);
      return next.map((it, idx) => ({ ...it, sortOrder: idx }));
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Field updater for active drawer item
  const updateActiveItem = (updates: Partial<EditorCategoryItem>) => {
    if (!activeSlug) return;
    setItems((curr) =>
      curr.map((it) => (it.categorySlug === activeSlug ? { ...it, ...updates } : it)),
    );
  };

  // Image upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file || !activeSlug) return;

    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) {
      e.target.value = "";
      setFileError("Cutout must be a PNG, WebP, or JPEG image (transparent PNG recommended).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      e.target.value = "";
      setFileError("Cutout image must be 5 MB or smaller.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    updateActiveItem({
      pendingFile: file,
      pendingPreviewUrl: previewUrl,
      removeImage: false,
    });
  };

  const handleRemoveImage = () => {
    if (!activeItem) return;
    if (activeItem.pendingPreviewUrl) {
      URL.revokeObjectURL(activeItem.pendingPreviewUrl);
    }
    updateActiveItem({
      pendingFile: null,
      pendingPreviewUrl: null,
      removeImage: true,
      imagePath: null,
    });
  };

  const handleResetColors = () => {
    if (!activeItem) return;
    updateActiveItem({
      leftBgType: "solid",
      leftBgColor: activeItem.defaultLeftBg,
      leftGradientEnd: "#d8dcd9",
      leftGradientAngle: 135,
      rightBgType: "solid",
      rightBgColor: activeItem.defaultRightBg,
      rightGradientEnd: "#0d282c",
      rightGradientAngle: 135,
    });
  };

  const handleResetPosition = () => {
    updateActiveItem({
      imageScale: 1.0,
      imageX: 0,
      imageY: 0,
    });
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFileError(null);

    const formData = new FormData();
    const payload = items.map((it, idx) => ({
      categorySlug: it.categorySlug,
      displayHeading: it.displayHeading,
      sortOrder: idx,
      leftBgType: it.leftBgType,
      leftBgColor: it.leftBgColor,
      leftGradientEnd: it.leftGradientEnd,
      leftGradientAngle: it.leftGradientAngle,
      rightBgType: it.rightBgType,
      rightBgColor: it.rightBgColor,
      rightGradientEnd: it.rightGradientEnd,
      rightGradientAngle: it.rightGradientAngle,
      imagePath: it.imagePath,
      imageScale: it.imageScale,
      imageX: it.imageX,
      imageY: it.imageY,
      removeImage: it.removeImage,
    }));

    formData.append("showcase_configuration", JSON.stringify(payload));

    // Append pending upload files
    for (const it of items) {
      if (it.pendingFile) {
        formData.append(`image_file_${it.categorySlug}`, it.pendingFile);
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* PAGE HEADER */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Website Customization</p>
          <h1>Category Showcase</h1>
          <p className={styles.subtitle}>
            Customize how appliance categories appear on the split-screen homepage showcase.
          </p>
        </div>

        <div className={styles.headerActions}>
          {state.error && (
            <span style={{ color: "var(--admin-danger)", fontSize: "13px", fontWeight: 500 }}>
              &bull; {state.error}
            </span>
          )}
          {state.success && !isDirty && (
            <span style={{ color: "#22c55e", fontSize: "13px", fontWeight: 500 }}>
              &bull; Showcase settings saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={pending || !isDirty}
            className={styles.primaryButton}
            id="save-category-showcase-btn"
          >
            {pending ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>

      {!isDatabaseReady && (
        <div className={styles.noticePanel} role="note" style={{ marginBottom: "24px" }}>
          <h2>Database Notice</h2>
          <p>
            Displaying approved defaults. To persist custom colors and center cutouts to Supabase, run <code>supabase/migrations/20261109_homepage_category_showcase.sql</code> in your Supabase SQL Editor.
          </p>
        </div>
      )}

      {/* CATEGORY SHOWCASE LIST */}
      <section className={styles.tablePanel} aria-labelledby="showcase-list-heading">
        <div className={styles.tableTitle}>
          <div>
            <h2 id="showcase-list-heading">
              Showcase Sequence
            </h2>
            <p>
              Drag or use Move Earlier / Later buttons to reorder the scrolling category sequence.
            </p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th style={{ width: "48px" }} aria-label="Reorder">#</th>
                <th style={{ width: "72px" }}>Cutout</th>
                <th>Category</th>
                <th>Homepage Heading</th>
                <th>Showcase Backgrounds</th>
                <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const effectiveImage = item.pendingPreviewUrl || item.imageUrl;
                const leftBg = resolveCssBackground(item.leftBgType, item.leftBgColor, item.leftGradientEnd, item.leftGradientAngle);
                const rightBg = resolveCssBackground(item.rightBgType, item.rightBgColor, item.rightGradientEnd, item.rightGradientAngle);
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <tr
                    key={item.categorySlug}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`${isDragging ? styles.trDragging : ""} ${isDragOver ? styles.trDragOver : ""}`}
                    style={{ cursor: "grab" }}
                  >
                    <td>
                      <span className={styles.dragHandle} title="Drag to reorder">
                        ⋮⋮ {index + 1}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "8px",
                          backgroundColor: "#EDEBE7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          border: "1px solid var(--admin-border)",
                        }}
                      >
                        {effectiveImage ? (
                          <img
                            src={effectiveImage}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "10px", color: "var(--admin-text-muted)" }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--admin-text)" }}>
                        {item.categoryName}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>
                        slug: {item.categorySlug}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          backgroundColor: "var(--admin-surface-muted)",
                          border: "1px solid var(--admin-border)",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--admin-text)",
                        }}
                      >
                        {item.displayHeading || item.categoryName}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          title={`Left: ${item.leftBgType} ${item.leftBgColor}`}
                          style={{
                            width: "36px",
                            height: "22px",
                            borderRadius: "4px 0 0 4px",
                            background: leftBg,
                            border: "1px solid var(--admin-border)",
                            borderRight: "none",
                          }}
                        />
                        <div
                          title={`Right: ${item.rightBgType} ${item.rightBgColor}`}
                          style={{
                            width: "36px",
                            height: "22px",
                            borderRadius: "0 4px 4px 0",
                            background: rightBg,
                            border: "1px solid var(--admin-border)",
                            marginLeft: "-8px",
                          }}
                        />
                        <span style={{ fontSize: "12px", color: "var(--admin-text-muted)" }}>
                          {item.leftBgType === "gradient" || item.rightBgType === "gradient" ? "Gradient" : "Solid"}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className={styles.secondaryButton}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          aria-label={`Move ${item.categoryName} earlier`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className={styles.secondaryButton}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          aria-label={`Move ${item.categoryName} later`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlug(item.categorySlug);
                            setIsDrawerOpen(true);
                            setFileError(null);
                          }}
                          className={styles.secondaryButton}
                          style={{ padding: "4px 12px", fontSize: "12px" }}
                          id={`edit-showcase-${item.categorySlug}`}
                        >
                          Customize
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* FOCUSED EDITOR DRAWER */}
      {isDrawerOpen && activeItem && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={styles.drawerPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-category-heading"
          >
            <div className={styles.drawerHeader}>
              <div>
                <h2 id="drawer-category-heading" className={styles.drawerHeaderTitle}>
                  Customize {activeItem.categoryName} Showcase
                </h2>
                <p className={styles.drawerHeaderSubtitle}>
                  Adjust display heading, left/right colors, cutout image, and placement.
                </p>
              </div>
              <button
                type="button"
                className={styles.drawerDoneBtn}
                onClick={() => setIsDrawerOpen(false)}
              >
                Done
              </button>
            </div>

            <div className={styles.drawerBody}>
              {fileError && (
                <div className={styles.alertError} style={{ marginBottom: "16px" }}>
                  {fileError}
                </div>
              )}

              {/* 1. CONTENT SECTION */}
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--admin-text)", marginBottom: "12px" }}>
                  1. Content &amp; Headline
                </h3>

                <div className={styles.drawerField}>
                  <label htmlFor="input-display-heading" className={styles.drawerLabel}>
                    Display Heading
                  </label>
                  <input
                    id="input-display-heading"
                    type="text"
                    className={styles.drawerInput}
                    value={activeItem.displayHeading}
                    placeholder={activeItem.categoryName}
                    onChange={(e) => updateActiveItem({ displayHeading: e.target.value })}
                  />
                  <p style={{ fontSize: "12px", color: "var(--admin-text-muted)", marginTop: "4px" }}>
                    This heading appears on the homepage split scene. Category slugs, product links, and catalog names remain unchanged.
                  </p>
                </div>
              </div>

              {/* 2. APPEARANCE SECTION */}
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--admin-text)", margin: 0 }}>
                    2. Background Appearance
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className={styles.secondaryButton}
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    Reset Colors
                  </button>
                </div>

                {/* AREA A — LEFT BACKGROUND */}
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid var(--admin-border)",
                    backgroundColor: "var(--admin-surface-muted)",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--admin-text)" }}>
                      Area A — Left Side (Behind Heading)
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => updateActiveItem({ leftBgType: "solid" })}
                        className={styles.secondaryButton}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          backgroundColor: activeItem.leftBgType === "solid" ? "var(--admin-primary)" : undefined,
                          color: activeItem.leftBgType === "solid" ? "var(--admin-primary-text)" : undefined,
                        }}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveItem({ leftBgType: "gradient" })}
                        className={styles.secondaryButton}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          backgroundColor: activeItem.leftBgType === "gradient" ? "var(--admin-primary)" : undefined,
                          color: activeItem.leftBgType === "gradient" ? "var(--admin-primary-text)" : undefined,
                        }}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  {activeItem.leftBgType === "solid" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="color"
                        value={activeItem.leftBgColor}
                        onChange={(e) => updateActiveItem({ leftBgColor: e.target.value })}
                        style={{ width: "38px", height: "36px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                      />
                      <input
                        type="text"
                        className={styles.drawerInput}
                        value={activeItem.leftBgColor}
                        onChange={(e) => updateActiveItem({ leftBgColor: e.target.value })}
                        style={{ width: "110px", fontFamily: "monospace" }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", width: "40px", color: "var(--admin-text-muted)" }}>Start</span>
                        <input
                          type="color"
                          value={activeItem.leftBgColor}
                          onChange={(e) => updateActiveItem({ leftBgColor: e.target.value })}
                          style={{ width: "32px", height: "30px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                        />
                        <input
                          type="text"
                          className={styles.drawerInput}
                          value={activeItem.leftBgColor}
                          onChange={(e) => updateActiveItem({ leftBgColor: e.target.value })}
                          style={{ width: "95px", fontFamily: "monospace", fontSize: "12px" }}
                        />
                        <span style={{ fontSize: "11px", width: "30px", color: "var(--admin-text-muted)" }}>End</span>
                        <input
                          type="color"
                          value={activeItem.leftGradientEnd}
                          onChange={(e) => updateActiveItem({ leftGradientEnd: e.target.value })}
                          style={{ width: "32px", height: "30px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                        />
                        <input
                          type="text"
                          className={styles.drawerInput}
                          value={activeItem.leftGradientEnd}
                          onChange={(e) => updateActiveItem({ leftGradientEnd: e.target.value })}
                          style={{ width: "95px", fontFamily: "monospace", fontSize: "12px" }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", width: "40px", color: "var(--admin-text-muted)" }}>Angle</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={activeItem.leftGradientAngle}
                          onChange={(e) => updateActiveItem({ leftGradientAngle: Number(e.target.value) })}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: "12px", width: "45px", fontFamily: "monospace" }}>
                          {activeItem.leftGradientAngle}°
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Contrast warning */}
                  {(() => {
                    const rec = getRecommendedTextColor(activeItem.leftBgColor);
                    return (
                      <div style={{ marginTop: "8px", fontSize: "11.5px", color: rec.meetsWCAG ? "var(--admin-text-muted)" : "var(--admin-danger)" }}>
                        {rec.meetsWCAG ? (
                          <span>✓ Contrast ratio: {rec.ratio}:1 (Readable text: {rec.color === "#FFFFFF" ? "Light" : "Dark"})</span>
                        ) : (
                          <span>⚠ Warning: Low contrast ({rec.ratio}:1). Headline text may be difficult to read.</span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* AREA B — RIGHT BACKGROUND */}
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid var(--admin-border)",
                    backgroundColor: "var(--admin-surface-muted)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--admin-text)" }}>
                      Area B — Right Side (Behind Links)
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => updateActiveItem({ rightBgType: "solid" })}
                        className={styles.secondaryButton}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          backgroundColor: activeItem.rightBgType === "solid" ? "var(--admin-primary)" : undefined,
                          color: activeItem.rightBgType === "solid" ? "var(--admin-primary-text)" : undefined,
                        }}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveItem({ rightBgType: "gradient" })}
                        className={styles.secondaryButton}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          backgroundColor: activeItem.rightBgType === "gradient" ? "var(--admin-primary)" : undefined,
                          color: activeItem.rightBgType === "gradient" ? "var(--admin-primary-text)" : undefined,
                        }}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  {activeItem.rightBgType === "solid" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="color"
                        value={activeItem.rightBgColor}
                        onChange={(e) => updateActiveItem({ rightBgColor: e.target.value })}
                        style={{ width: "38px", height: "36px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                      />
                      <input
                        type="text"
                        className={styles.drawerInput}
                        value={activeItem.rightBgColor}
                        onChange={(e) => updateActiveItem({ rightBgColor: e.target.value })}
                        style={{ width: "110px", fontFamily: "monospace" }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", width: "40px", color: "var(--admin-text-muted)" }}>Start</span>
                        <input
                          type="color"
                          value={activeItem.rightBgColor}
                          onChange={(e) => updateActiveItem({ rightBgColor: e.target.value })}
                          style={{ width: "32px", height: "30px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                        />
                        <input
                          type="text"
                          className={styles.drawerInput}
                          value={activeItem.rightBgColor}
                          onChange={(e) => updateActiveItem({ rightBgColor: e.target.value })}
                          style={{ width: "95px", fontFamily: "monospace", fontSize: "12px" }}
                        />
                        <span style={{ fontSize: "11px", width: "30px", color: "var(--admin-text-muted)" }}>End</span>
                        <input
                          type="color"
                          value={activeItem.rightGradientEnd}
                          onChange={(e) => updateActiveItem({ rightGradientEnd: e.target.value })}
                          style={{ width: "32px", height: "30px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                        />
                        <input
                          type="text"
                          className={styles.drawerInput}
                          value={activeItem.rightGradientEnd}
                          onChange={(e) => updateActiveItem({ rightGradientEnd: e.target.value })}
                          style={{ width: "95px", fontFamily: "monospace", fontSize: "12px" }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "11px", width: "40px", color: "var(--admin-text-muted)" }}>Angle</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={activeItem.rightGradientAngle}
                          onChange={(e) => updateActiveItem({ rightGradientAngle: Number(e.target.value) })}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: "12px", width: "45px", fontFamily: "monospace" }}>
                          {activeItem.rightGradientAngle}°
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Contrast warning */}
                  {(() => {
                    const rec = getRecommendedTextColor(activeItem.rightBgColor);
                    return (
                      <div style={{ marginTop: "8px", fontSize: "11.5px", color: rec.meetsWCAG ? "var(--admin-text-muted)" : "var(--admin-danger)" }}>
                        {rec.meetsWCAG ? (
                          <span>✓ Contrast ratio: {rec.ratio}:1 (Readable text: {rec.color === "#FFFFFF" ? "Light" : "Dark"})</span>
                        ) : (
                          <span>⚠ Warning: Low contrast ({rec.ratio}:1). Subcategory links may be difficult to read.</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 3. CENTER CUTOUT SECTION */}
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--admin-text)", margin: 0 }}>
                    3. Center Product Cutout
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    className={styles.secondaryButton}
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    Reset Sizing &amp; Position
                  </button>
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid var(--admin-border)",
                    backgroundColor: "var(--admin-surface-muted)",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: "80px",
                        height: "90px",
                        borderRadius: "8px",
                        backgroundColor: "#EDEBE7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "1px solid var(--admin-border)",
                        position: "relative",
                      }}
                    >
                      <img
                        src={activeItem.pendingPreviewUrl || activeItem.imageUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          transform: `scale(${activeItem.imageScale}) translate(${activeItem.imageX}%, ${activeItem.imageY}%)`,
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label
                        className={styles.secondaryButton}
                        style={{ cursor: "pointer", textAlign: "center", padding: "6px 12px" }}
                      >
                        <span>Upload PNG Cutout</span>
                        <input
                          type="file"
                          accept="image/png,image/webp,image/jpeg"
                          onChange={handleImageFileChange}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className={styles.secondaryButton}
                        style={{ fontSize: "11px", color: "var(--admin-danger)" }}
                      >
                        Restore Default Cutout
                      </button>
                      <span style={{ fontSize: "11px", color: "var(--admin-text-muted)" }}>
                        Recommended: 1080 × 1920 px (9:16) transparent PNG cutout.
                      </span>
                    </div>
                  </div>

                  {/* Scale slider (75% to 125%) */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <label htmlFor="input-image-scale" style={{ fontWeight: 600, color: "var(--admin-text)" }}>
                        Image Size
                      </label>
                      <span style={{ fontFamily: "monospace" }}>{Math.round(activeItem.imageScale * 100)}%</span>
                    </div>
                    <input
                      id="input-image-scale"
                      type="range"
                      min={0.75}
                      max={1.25}
                      step={0.01}
                      value={activeItem.imageScale}
                      onChange={(e) => updateActiveItem({ imageScale: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </div>

                  {/* Horizontal offset (-15% to +15%) */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <label htmlFor="input-image-x" style={{ fontWeight: 600, color: "var(--admin-text)" }}>
                        Horizontal Position
                      </label>
                      <span style={{ fontFamily: "monospace" }}>{activeItem.imageX > 0 ? `+${activeItem.imageX}` : activeItem.imageX}%</span>
                    </div>
                    <input
                      id="input-image-x"
                      type="range"
                      min={-15}
                      max={15}
                      step={1}
                      value={activeItem.imageX}
                      onChange={(e) => updateActiveItem({ imageX: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </div>

                  {/* Vertical offset (-15% to +15%) */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <label htmlFor="input-image-y" style={{ fontWeight: 600, color: "var(--admin-text)" }}>
                        Vertical Position
                      </label>
                      <span style={{ fontFamily: "monospace" }}>{activeItem.imageY > 0 ? `+${activeItem.imageY}` : activeItem.imageY}%</span>
                    </div>
                    <input
                      id="input-image-y"
                      type="range"
                      min={-15}
                      max={15}
                      step={1}
                      value={activeItem.imageY}
                      onChange={(e) => updateActiveItem({ imageY: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              {/* 4. LIVE PREVIEW */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--admin-text)", margin: 0 }}>
                    4. Real-time Preview
                  </h3>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      className={styles.secondaryButton}
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        backgroundColor: previewViewport === "desktop" ? "var(--admin-primary)" : undefined,
                        color: previewViewport === "desktop" ? "var(--admin-primary-text)" : undefined,
                      }}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      className={styles.secondaryButton}
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        backgroundColor: previewViewport === "mobile" ? "var(--admin-primary)" : undefined,
                        color: previewViewport === "mobile" ? "var(--admin-primary-text)" : undefined,
                      }}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                {(() => {
                  const leftBg = resolveCssBackground(activeItem.leftBgType, activeItem.leftBgColor, activeItem.leftGradientEnd, activeItem.leftGradientAngle);
                  const rightBg = resolveCssBackground(activeItem.rightBgType, activeItem.rightBgColor, activeItem.rightGradientEnd, activeItem.rightGradientAngle);
                  const leftInk = getRecommendedTextColor(activeItem.leftBgColor).color;
                  const rightInk = getRecommendedTextColor(activeItem.rightBgColor).color;
                  const effectiveImg = activeItem.pendingPreviewUrl || activeItem.imageUrl;

                  if (previewViewport === "mobile") {
                    return (
                      <div
                        style={{
                          width: "240px",
                          height: "360px",
                          margin: "0 auto",
                          borderRadius: "16px",
                          border: "2px solid var(--admin-border)",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                          overflow: "hidden",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}
                      >
                        <div style={{ height: "44%", background: leftBg, padding: "16px 12px", color: leftInk }}>
                          <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.04em" }}>
                            {activeItem.displayHeading || activeItem.categoryName}
                          </span>
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: "38%",
                            transform: `translate(calc(-50% + ${activeItem.imageX}%), calc(-50% + ${activeItem.imageY}%)) scale(${activeItem.imageScale})`,
                            width: "120px",
                            height: "160px",
                            zIndex: 2,
                            pointerEvents: "none",
                          }}
                        >
                          <img
                            src={effectiveImg}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              filter: "drop-shadow(0 12px 14px rgba(0,0,0,0.25))",
                            }}
                          />
                        </div>
                        <div style={{ height: "56%", background: rightBg, padding: "28px 12px 12px", color: rightInk }}>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {activeItem.subcategories.slice(0, 3).map((sub) => (
                              <li
                                key={sub.slug}
                                style={{
                                  fontSize: "11px",
                                  padding: "6px 0",
                                  borderBottom: `1px solid ${rightInk === "#FFFFFF" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{sub.name}</span>
                                <span>↗</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      style={{
                        width: "100%",
                        height: "220px",
                        borderRadius: "12px",
                        border: "1px solid var(--admin-border)",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div style={{ background: leftBg, padding: "24px 20px", display: "flex", alignItems: "center", color: leftInk }}>
                        <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>
                          {activeItem.displayHeading || activeItem.categoryName}
                        </span>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: `translate(calc(-50% + ${activeItem.imageX}%), calc(-50% + ${activeItem.imageY}%)) scale(${activeItem.imageScale})`,
                          width: "140px",
                          height: "180px",
                          zIndex: 2,
                          pointerEvents: "none",
                        }}
                      >
                        <img
                          src={effectiveImg}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.25))",
                          }}
                        />
                      </div>
                      <div style={{ background: rightBg, padding: "24px 20px 24px 44px", display: "flex", flexDirection: "column", justifyContent: "center", color: rightInk }}>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {activeItem.subcategories.slice(0, 3).map((sub) => (
                            <li
                              key={sub.slug}
                              style={{
                                fontSize: "12px",
                                padding: "6px 0",
                                borderBottom: `1px solid ${rightInk === "#FFFFFF" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>{sub.name}</span>
                              <span>↗</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </aside>
        </>
      )}
    </form>
  );
}
