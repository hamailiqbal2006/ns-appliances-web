import Link from "next/link";
import { cookies } from "next/headers";
import { getAdminProducts, productImageUrl } from "@/lib/supabase-admin";
import { getAdminCategories, resolveCategoryForProduct } from "@/lib/categories";
import { getAllCategoryProductOrders } from "@/lib/category-order";
import {
  resolveAvailabilityStatus,
  getAvailabilityPresentation,
} from "@/lib/product-availability";
import { ProductsTableClient, type ProductRowViewModel } from "./products-table-client";
import styles from "../../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

export default async function ProductsAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value;
  const [rawProducts, { categories }] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(accessToken),
  ]);
  const categoryOrders = getAllCategoryProductOrders();

  const viewModels: ProductRowViewModel[] = rawProducts.map((product) => {
    const cat = resolveCategoryForProduct(
      product.category_slug,
      product.subcategory_slug,
      categories
    );
    const availability = resolveAvailabilityStatus(product);
    const pres = getAvailabilityPresentation(availability);
    const hasTrackedStock =
      product.stock_quantity !== null &&
      product.stock_quantity !== undefined &&
      product.stock_quantity > 0;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: productImageUrl(product.image_path),
      categorySlug: product.category_slug,
      categoryName: cat.name,
      subcategorySlug: product.subcategory_slug,
      subcategoryName:
        product.subcategory_slug && product.subcategory_slug !== cat.slug
          ? product.subcategory_slug
          : null,
      priceFormatted:
        product.price_pkr !== null
          ? new Intl.NumberFormat("en-PK").format(product.price_pkr)
          : null,
      status: product.status,
      availabilityStatus: availability,
      availabilityBadgeLabel: pres.badgeLabel,
      stockFormatted: hasTrackedStock
        ? `${new Intl.NumberFormat("en-PK").format(product.stock_quantity!)} units`
        : "Untracked",
      updatedFormatted: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
        new Date(product.updated_at)
      ),
    };
  });

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Catalog</p>
          <h1>Products</h1>
          <p className={styles.subtitle}>
            Manage appliance specifications, showroom pricing, inventory status, and storefront visibility.
          </p>
        </div>
        <Link href="/admin/products/new" className={styles.primaryButton}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add product
        </Link>
      </div>

      <section className={styles.tablePanel} aria-labelledby="product-records-heading">
        <div className={styles.tableTitle}>
          <h2 id="product-records-heading">Database records</h2>
          <p>
            {viewModels.length} {viewModels.length === 1 ? "product" : "products"}
          </p>
        </div>

        <ProductsTableClient products={viewModels} categories={categories} categoryOrders={categoryOrders} />
      </section>
    </>
  );
}
