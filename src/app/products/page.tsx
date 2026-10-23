import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProductsCatalog } from "@/components/products-catalog";

export const metadata: Metadata = {
  title: "All Products Catalog | NS Home Appliances",
  description:
    "Explore the complete NS Home Appliances catalog — cooling fans, room coolers, washing machines, kitchen appliances, and water heating geysers.",
};

export default function ProductsPage() {
  return (
    <div className="info-page">
      <SiteNav detail />
      <main className="info-main" id="main-content">
        <p className="info-eyebrow">NS Home Appliances · Complete Collection</p>
        <h1 className="info-title">All Products</h1>
        <p className="info-lead">
          Explore our range of dependable home appliances designed for comfort,
          efficiency, and durability. Filter by category or select an item to inspect
          its visual story.
        </p>

        <section aria-labelledby="catalog-heading">
          <h2 id="catalog-heading" className="sr-only">
            Products Catalog
          </h2>
          <ProductsCatalog />
        </section>

        <section aria-labelledby="products-cta-title" className="info-cta-bar">
          <h2 id="products-cta-title" className="sr-only">
            More Options
          </h2>
          <Link href="/#visit" className="info-btn-primary">
            Visit Our Store &rarr;
          </Link>
          <Link href="/faq" className="info-btn-secondary">
            Read FAQs
          </Link>
          <Link href="/contact" className="info-btn-secondary">
            Contact Showroom
          </Link>
        </section>
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
