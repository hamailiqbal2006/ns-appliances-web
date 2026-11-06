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
            <span style={{ fontSize: "18px" }}>📦</span>
            <div>
              <strong>Manage Products</strong>
              <span style={{ display: "block", fontSize: "12px", color: "#687370", marginTop: "2px" }}>
                Update pricing, showroom stock, and media
              </span>
            </div>
          </Link>
          <Link href="/admin/categories" className={styles.shortcutCard}>
            <span style={{ fontSize: "18px" }}>🗂️</span>
            <div>
              <strong>Store Categories</strong>
              <span style={{ display: "block", fontSize: "12px", color: "#687370", marginTop: "2px" }}>
                Organize appliance collections and filters
              </span>
            </div>
          </Link>
          <Link href="/admin/settings" className={styles.shortcutCard}>
            <span style={{ fontSize: "18px" }}>⚙️</span>
            <div>
              <strong>Store Settings</strong>
              <span style={{ display: "block", fontSize: "12px", color: "#687370", marginTop: "2px" }}>
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
                        <span style={{ fontWeight: 600, color: "#141c1b" }}>{cat.name}</span>
                      </td>
                      <td>
                        {product.price_pkr !== null ? (
                          <span style={{ fontWeight: 600, color: "#141c1b" }}>
                            PKR {new Intl.NumberFormat("en-PK").format(product.price_pkr)}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca6a2", fontStyle: "italic" }}>Showroom inquiry</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.status} data-status={pres.status}>
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
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#687370", fontSize: "13.5px" }}>
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
