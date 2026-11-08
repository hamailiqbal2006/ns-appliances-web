/* eslint-disable @next/next/no-img-element -- Supabase storage URLs configured by owner */
import Link from "next/link";
import { cookies } from "next/headers";
import {
  getAdminOverview,
  getAdminProducts,
  productImageUrl,
} from "@/lib/supabase-admin";
import { getAdminCategories, resolveCategoryForProduct } from "@/lib/categories";
import {
  resolveAvailabilityStatus,
  getAvailabilityPresentation,
} from "@/lib/product-availability";
import styles from "../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value;

  const [overview, categoryState, products] = await Promise.all([
    getAdminOverview(),
    getAdminCategories(accessToken),
    getAdminProducts(),
  ]);

  const { productCount } = overview;
  const { categories, isDatabaseConnected: categoriesReady } = categoryState;
  const recentProducts = products.slice(0, 5);

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Dashboard</p>
          <h1>Store Overview</h1>
          <p className={styles.subtitle}>
            Central management for NS Home Appliances catalog, store settings, and website presentation.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin/categories/new" className={styles.secondaryButton}>
            Add category
          </Link>
          <Link href="/admin/products/new" className={styles.primaryButton}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add product
          </Link>
        </div>
      </div>

      {/* Balanced Metric Cards */}
      <section className={styles.metrics} aria-label="Current store data">
        <article className={styles.metric}>
          <p className={styles.metricLabel}>Active Products</p>
          <strong className={styles.metricValue}>{productCount}</strong>
          <p className={styles.metricNote}>Live appliance records in store catalog</p>
        </article>

        <article className={styles.metric}>
          <p className={styles.metricLabel}>Product Categories</p>
          <strong className={styles.metricValue}>{categories.length}</strong>
          <p className={styles.metricNote}>Organized showroom collections</p>
        </article>
      </section>

      {/* Operational Shortcuts */}
      <section className={styles.shortcutsPanel} aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className={styles.shortcutsTitle}>
          Operational Shortcuts
        </h2>
        <div className={styles.shortcutsGrid}>
          <Link href="/admin/products" className={styles.shortcutCard}>
            <div className={styles.shortcutIconWrap} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <strong className={styles.shortcutName}>Manage Products</strong>
              <span className={styles.shortcutDesc}>
                Update pricing, showroom stock, and media
              </span>
            </div>
          </Link>
          <Link href="/admin/categories" className={styles.shortcutCard}>
            <div className={styles.shortcutIconWrap} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <div>
              <strong className={styles.shortcutName}>Store Categories</strong>
              <span className={styles.shortcutDesc}>
                Organize appliance collections and filters
              </span>
            </div>
          </Link>
          <Link href="/admin/settings" className={styles.shortcutCard}>
            <div className={styles.shortcutIconWrap} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <strong className={styles.shortcutName}>Store Settings</strong>
              <span className={styles.shortcutDesc}>
                Update showroom address, hours, and WhatsApp
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Recent Catalog Products */}
      <section className={styles.tablePanel} style={{ marginTop: "24px" }} aria-labelledby="recent-products-heading">
        <div className={styles.tableTitle}>
          <div>
            <h2 id="recent-products-heading">Catalog Appliances</h2>
            <p>Recently managed products in the showroom catalog</p>
          </div>
          <Link href="/admin/products" className={styles.tableLink} style={{ fontSize: "13px", fontWeight: 600 }}>
            View all products →
          </Link>
        </div>

        {recentProducts.length > 0 ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th scope="col" style={{ width: "38%" }}>Product</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map((product) => {
                  const cat = resolveCategoryForProduct(product.category_slug, product.subcategory_slug, categories);
                  const availability = resolveAvailabilityStatus(product);
                  const pres = getAvailabilityPresentation(availability);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className={styles.productCell}>
                          {productImageUrl(product.image_path) ? (
                            <img src={productImageUrl(product.image_path) ?? ""} alt="" />
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
                        <span style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>{cat.name}</span>
                      </td>
                      <td>
                        {product.price_pkr !== null ? (
                          <span style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>
                            PKR {new Intl.NumberFormat("en-PK").format(product.price_pkr)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>Showroom inquiry</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.statusDotLabel}>
                          <span
                            className={`${styles.statusDot} ${
                              pres.status === "available"
                                ? styles.statusDotActive
                                : pres.status === "out_of_stock"
                                ? styles.statusDotDanger
                                : styles.statusDotDraft
                            }`}
                            aria-hidden
                          />
                          {pres.badgeLabel}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className={styles.secondaryButton}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
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
        ) : (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--admin-text-secondary)", fontSize: "13.5px" }}>
            No products found. Use <strong>Add product</strong> to add your first appliance.
          </div>
        )}
      </section>

      {!categoriesReady ? (
        <section className={styles.noticePanel} aria-labelledby="admin-setup-note" style={{ marginTop: "24px" }}>
          <h2 id="admin-setup-note">Database setup pending</h2>
          <p>
            <code>supabase/migrations/20261027_categories_management.sql</code> is required before custom categories can be modified.
            These areas remain intentionally safeguarded to prevent data inconsistency.
          </p>
        </section>
      ) : null}
    </>
  );
}
