import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getAdminCategory } from "@/lib/categories";
import { requireAdmin } from "@/lib/supabase-admin";
import { CategoryForm } from "../category-form";
import { DeleteCategoryForm } from "../delete-category-form";
import styles from "../../../admin.module.css";

export const instant = false;

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value;

  const category = await getAdminCategory(id, accessToken);
  if (!category) notFound();

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>
            <Link href="/admin/categories" className={styles.tableLink}>
              ← Categories
            </Link>
          </p>
          <h1>Edit Category</h1>
        </div>
        <DeleteCategoryForm
          id={category.id}
          slug={category.slug}
          name={category.name}
          productCount={category.product_count ?? 0}
        />
      </div>
      <CategoryForm category={category} />
    </>
  );
}
