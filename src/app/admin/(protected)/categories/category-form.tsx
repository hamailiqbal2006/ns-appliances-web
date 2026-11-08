"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { EDITORIAL_GROUPS, type CategoryRecord } from "@/lib/category-types";
import { saveCategoryAction } from "../../actions";
import { AdminSwitch } from "../../admin-switch";
import styles from "../../admin.module.css";

function subcategoriesToText(subcategories: CategoryRecord["subcategories"]) {
  if (!subcategories || !subcategories.length) return "";
  return subcategories.map((sub) => sub.name).join("\n");
}

export function CategoryForm({ category }: { category?: CategoryRecord }) {
  const [state, formAction, pending] = useActionState(saveCategoryAction, { error: null });
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [editorialGroup, setEditorialGroup] = useState(category?.editorial_group ?? "cooling");
  const [autoSlug, setAutoSlug] = useState(!category);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (autoSlug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      );
    }
  };

  return (
    <form className={styles.editorForm} action={formAction} noValidate>
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <fieldset>
        <legend>Category details</legend>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldWide}>
            Category name
            <input
              name="name"
              required
              maxLength={100}
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Room Coolers, Washing Machines"
            />
          </label>

          <label>
            URL slug
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value);
              }}
              aria-describedby="cat-slug-help"
            />
            <span id="cat-slug-help" className={styles.fieldHelp}>
              Kebab-case slug used in catalog URLs and search filtering.
            </span>
          </label>

          <label>
            Editorial presentation group
            <select
              name="editorial_group"
              required
              value={editorialGroup}
              onChange={(e) => setEditorialGroup(e.target.value as CategoryRecord["editorial_group"])}
            >
              {EDITORIAL_GROUPS.map((group) => (
                <option key={group.slug} value={group.slug}>
                  {group.name}
                </option>
              ))}
            </select>
            <span className={styles.fieldHelp}>
              Connects this real product category to the homepage editorial showcase.
            </span>
          </label>

          <label>
            Display order
            <input
              name="display_order"
              type="number"
              min="0"
              step="1"
              defaultValue={category?.display_order ?? 0}
            />
          </label>

          <div className={styles.fieldWide}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                padding: "14px 16px",
                border: "1px solid var(--admin-border)",
                borderRadius: "var(--admin-radius-sm)",
                backgroundColor: "var(--admin-surface-muted)",
              }}
            >
              <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
              <div>
                <strong style={{ display: "block", color: "var(--admin-text-primary)", fontSize: "13.5px" }}>
                  {isActive ? "Category Active" : "Category Archived"}
                </strong>
                <span style={{ display: "block", marginTop: "3px", color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.45 }}>
                  When enabled, this category and its published products appear in catalog navigation and filtering.
                </span>
              </div>
              <AdminSwitch
                checked={isActive}
                onChange={setIsActive}
                ariaLabel="Category active status"
              />
            </div>
          </div>

          <label className={styles.fieldWide}>
            Description (Optional)
            <textarea
              name="description"
              rows={3}
              defaultValue={category?.description ?? ""}
              placeholder="Short showroom summary for this category..."
            />
          </label>

          <label className={styles.fieldWide}>
            Subcategories
            <textarea
              name="subcategories"
              rows={5}
              defaultValue={category ? subcategoriesToText(category.subcategories) : ""}
              aria-describedby="cat-subs-help"
              placeholder="Juicer Blender — 2-in-1&#10;Juicer Blender — 3-in-1&#10;Juicer Blender — 4-in-1"
            />
            <span id="cat-subs-help" className={styles.fieldHelp}>
              Enter one subcategory per line. Slugs are automatically generated for each subcategory.
            </span>
          </label>
        </div>
      </fieldset>

      {state.error ? (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/admin/categories" className={styles.secondaryButton}>
            Cancel
          </Link>
          <button className={styles.primaryButton} type="submit" disabled={pending}>
            {pending ? "Saving…" : category ? "Save category" : "Create category"}
          </button>
        </div>
      </div>
    </form>
  );
}
