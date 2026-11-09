"use client";

import { useState, useRef } from "react";
import { deleteCategoryAction } from "../../actions";
import styles from "../../admin.module.css";
import { ConfirmationModal } from "../confirmation-modal";

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
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hasProducts = productCount > 0;

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
      <form
        ref={formRef}
        action={deleteCategoryAction}
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
          <button
            type="button"
            onClick={handleTriggerClick}
            className={styles.dangerButton}
          >
            Delete category
          </button>
        )}
      </form>

      <ConfirmationModal
        isOpen={isOpen}
        title="Delete Category"
        message={`Are you sure you want to delete category "${name}"? This action cannot be undone.`}
        confirmLabel="Delete Category"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}
