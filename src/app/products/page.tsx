import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProductsCatalog } from "@/components/products-catalog";
import { getStorefrontProducts } from "@/lib/public-catalog";
import { getStorefrontCategories } from "@/lib/categories";
import styles from "@/components/category-catalog.module.css";

export const metadata: Metadata = {
  title: "All Appliances | NS Home Appliances",
  description:
    "Explore appliances available from NS Home Appliances — room coolers, washing machines, dryers, fans, kitchen appliances, and water heaters.",
};

export const instant = false;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; subcategory?: string }>;
}) {
  const { category } = await searchParams;
  const [products, categories] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCategories(),
  ]);

  return (
    <div className={styles.categoryPage}>
      <SiteNav alwaysFormed />
      <main className={`${styles.catalogMain} ${styles.allProductsMain}`} id="main-content">
        <header className={styles.allProductsHeader}>
          <div className={styles.allProductsHeaderContent}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/" className={styles.breadcrumbLink}>
                Home
              </Link>
              <span className={styles.breadcrumbSeparator} aria-hidden="true">
                /
              </span>
              <span className={styles.breadcrumbCurrent}>All Appliances</span>
            </nav>

            <h1 className={styles.allProductsTitle}>
              All Appliances
            </h1>
          </div>
        </header>

        <section aria-labelledby="catalog-heading">
          <h2 id="catalog-heading" className="sr-only">
            Products Catalog
          </h2>
          <ProductsCatalog
            products={products}
            categories={categories}
            initialCategory={category}
          />
        </section>
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
