import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CategoryCatalog } from "@/components/category-catalog";
import { getStorefrontProducts } from "@/lib/public-catalog";
import { getStorefrontCategories, resolveCategoryForProduct } from "@/lib/categories";
import { categories as editorialCategories } from "@/data/catalog";
import styles from "@/components/category-catalog.module.css";

export const instant = false;

export function generateStaticParams() {
  return editorialCategories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      category: category.slug,
      subcategory: subcategory.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const allCategories = await getStorefrontCategories();
  const cat = resolveCategoryForProduct(categorySlug, subcategorySlug, allCategories);

  return {
    title: `${cat.name} | NS Home Appliances`,
    description:
      cat.description ||
      `Browse verified ${cat.name} appliances in our showroom collection. Inspect technical specifications and contact our showroom.`,
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const { sub: querySub } = await searchParams;

  const [products, allCategories] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCategories(),
  ]);

  const cat = resolveCategoryForProduct(categorySlug, subcategorySlug, allCategories);
  if (!cat) notFound();

  return (
    <div className={styles.categoryPage}>
      <SiteNav alwaysFormed />
      <main id="main-content">
        <CategoryCatalog
          category={cat}
          products={products}
          initialSubcategory={querySub}
        />
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
