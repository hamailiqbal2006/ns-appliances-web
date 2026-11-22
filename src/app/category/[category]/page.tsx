import { notFound, redirect } from "next/navigation";
import { getStorefrontCategories, findCategoryForRoute } from "@/lib/categories";

export const instant = false;

export default async function CategoryRedirectPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const allCategories = await getStorefrontCategories();
  const cat = findCategoryForRoute(categorySlug, null, allCategories);
  if (!cat) notFound();

  // Redirect to canonical /category/[editorialGroup]/[categorySlug]
  redirect(`/category/${cat.editorial_group}/${cat.slug}`);
}
