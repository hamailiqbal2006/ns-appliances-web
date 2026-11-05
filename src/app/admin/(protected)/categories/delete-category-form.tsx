"use client";

import { deleteCategoryAction } from "../../actions";
import styles from "../../admin.module.css";

export function DeleteCategoryForm({
  id,
  slug,
  name,
  productCount,
}: {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}) {
  const hasProducts = productCount > 0;

  return (
    <form
      action={deleteCategoryAction}
      onSubmit={(e) => {
        if (!confirm(`Are you sure you want to delete category "${name}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
      className={styles.inlineDelete}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      {hasProducts ? (
        <span
          title={`Cannot delete because ${productCount} product(s) are assigned to this category.`}
          style={{ color: "#8a9491", fontSize: "12px", fontStyle: "italic" }}
        >
          Locked ({productCount} product{productCount === 1 ? "" : "s"})
        </span>
      ) : (
        <button type="submit" className={styles.dangerButton}>
          Delete category
        </button>
      )}
    </form>
  );
}
