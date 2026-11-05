import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminProduct, getProductImages, productImageUrl, requireAdmin } from "@/lib/supabase-admin";
import { getAdminCategories } from "@/lib/categories";
import { DeleteProductForm } from "../delete-product-form";
import { ProductForm } from "../product-form";
import styles from "../../../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value;

  const [product, { categories }, dbImages] = await Promise.all([
    getAdminProduct(id),
    getAdminCategories(accessToken),
    accessToken ? getProductImages(id, accessToken) : Promise.resolve([]),
  ]);

  if (!product) notFound();

  // Map dbImages to gallery items with URLs
  const initialGallery = dbImages.map((img) => ({
    id: img.id,
    storagePath: img.storage_path,
    url: productImageUrl(img.storage_path) || "",
    altText: img.alt_text || "",
    isPrimary: img.is_primary,
    sortOrder: img.sort_order,
    mediaType: img.media_type,
  }));

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/admin/products" className={styles.tableLink}>
              ← Products
            </Link>
          </p>
          <h1>Edit product</h1>
        </div>
        <div className={styles.headerActions}>
          <DeleteProductForm id={product.id} />
        </div>
      </div>
      <ProductForm
        product={product}
        imageUrl={productImageUrl(product.image_path)}
        categories={categories}
        initialGallery={initialGallery}
      />
    </>
  );
}
