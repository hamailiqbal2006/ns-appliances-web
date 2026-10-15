import Link from "next/link";
import { categories } from "@/data/catalog";

export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({ category: category.slug, subcategory: subcategory.slug })),
  );
}

export default async function SubcategoryPage({ params }: { params: Promise<{ category: string; subcategory: string }> }) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const category = categories.find((item) => item.slug === categorySlug);
  const subcategory = category?.subcategories.find((item) => item.slug === subcategorySlug);
  return <main className="placeholder-route"><p className="eyebrow">NS Home Appliances / future category route</p><h1>{subcategory?.name ?? "Category"}</h1><p>This route is prepared for confirmed products, product photography and store information.</p><Link href="/#categories">Back to categories <span>←</span></Link></main>;
}
