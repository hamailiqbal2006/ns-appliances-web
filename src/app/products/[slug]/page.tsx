import { notFound } from "next/navigation";
import { productBySlug, products } from "@/data/catalog";
import { ProductStory } from "@/components/product-story";

export function generateStaticParams() { return products.map(({ slug }) => ({ slug })); }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();
  return <ProductStory product={product} />;
}
