import Link from "next/link";
import { getAdminCategories } from "@/lib/categories";
import { requireAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import styles from "../../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

export default async function CategoriesAdminPage() {
  await requireAdmin();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value;
  const { categories, isDatabaseConnected } = await getAdminCategories(accessToken);

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Catalog</p>
          <h1>Categories</h1>
          <p className={styles.subtitle}>
            Organize appliance physical classifications, subcategories, and homepage editorial groupings.
          </p>
        </div>
        <Link href="/admin/categories/new" className={styles.primaryButton}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add category
        </Link>
      </div>

      {!isDatabaseConnected ? (
        <div className={styles.noticePanel} style={{ marginBottom: "24px", marginTop: "0" }}>
          <h2>Initial category setup ready</h2>
          <p>
            The 9 verified NS Home Appliances physical categories are currently active and mapped to
            their respective editorial groups. To enable custom database modifications, run the migration file{" "}
            <code>supabase/migrations/20261027_categories_management.sql</code> in the Supabase SQL Editor.
          </p>
        </div>
      ) : null}

      <section className={styles.tablePanel} aria-labelledby="category-records-heading">
        <div className={styles.tableTitle}>
          <h2 id="category-records-heading">Category records</h2>
          <p>
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: "24%" }}>Category</th>
                <th scope="col">Slug</th>
                <th scope="col">Editorial Group</th>
                <th scope="col">Subcategories</th>
                <th scope="col">Order</th>
                <th scope="col">Status</th>
                <th scope="col">Products</th>
                <th scope="col" style={{ textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <strong style={{ color: "var(--admin-text-primary)", fontSize: "14px" }}>{cat.name}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: "12px", background: "var(--admin-surface-muted)", color: "var(--admin-text-primary)", padding: "2px 6px", borderRadius: "4px" }}>
                      {cat.slug}
                    </code>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 600,
                        textTransform: "capitalize",
                        color: "var(--admin-text-secondary)",
                        background: "var(--admin-surface-muted)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {cat.editorial_group}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "13px", color: "var(--admin-text-secondary)" }}>
                      {cat.subcategories.length}{" "}
                      {cat.subcategories.length === 1 ? "subcategory" : "subcategories"}
                    </span>
                  </td>
                  <td style={{ color: "var(--admin-text-muted)" }}>{cat.display_order}</td>
                  <td>
                    <span className={styles.statusDotLabel}>
                      <span className={`${styles.statusDot} ${cat.is_active ? styles.statusDotActive : styles.statusDotDraft}`} aria-hidden />
                      {cat.is_active ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>
                      {cat.product_count}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/admin/categories/${cat.id}`}
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "5px 12px", fontSize: "12.5px" }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
