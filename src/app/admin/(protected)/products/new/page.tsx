import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/supabase-admin";
import { getAdminCategories } from "@/lib/categories";
import { ProductForm } from "../product-form";
import styles from "../../../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

export default async function NewProductPage() {
  await requireAdmin();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value;
  const { categories } = await getAdminCategories(accessToken);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/admin/products" className={styles.tableLink}>
              ← Products
            </Link>
          </p>
          <h1>Add Product</h1>
        </div>
      </div>
      <ProductForm imageUrl={null} categories={categories} />
    </>
  );
}
