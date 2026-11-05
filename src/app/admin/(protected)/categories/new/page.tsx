import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-admin";
import { CategoryForm } from "../category-form";
import styles from "../../../admin.module.css";

// This route is protected by a session-aware parent layout.
export const instant = false;

export default async function NewCategoryPage() {
  await requireAdmin();

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/admin/categories" className={styles.tableLink}>
              ← Categories
            </Link>
          </p>
          <h1>Add Category</h1>
        </div>
      </div>
      <CategoryForm />
    </>
  );
}
