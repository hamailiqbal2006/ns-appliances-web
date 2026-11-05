import { redirect } from "next/navigation";
import { getStorefrontCategories, resolveCategoryForProduct } from "@/lib/categories";

export const instant = false;

export default async function CategoryRedirectPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const allCategories = await getStorefrontCategories();
  const cat = resolveCategoryForProduct(categorySlug, null, allCategories);

  // Redirect to canonical /category/[editorialGroup]/[categorySlug]
  redirect(`/category/${cat.editorial_group}/${cat.slug}`);
}
