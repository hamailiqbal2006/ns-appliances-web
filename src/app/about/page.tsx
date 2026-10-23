import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { categories } from "@/data/catalog";

export const metadata: Metadata = {
  title: "About Us | NS Home Appliances",
  description:
    "Learn about NS Home Appliances — physical showroom and digital appliance exploration catalog for cooling, laundry, kitchen, and home comfort.",
};

export default function AboutPage() {
  return (
    <div className="info-page">
      <SiteNav detail />
      <main className="info-main" id="main-content">
        <p className="info-eyebrow">NS Home Appliances · About Us</p>
        <h1 className="info-title">Curated Comfort for Every Home</h1>
        <p className="info-lead">
          NS Home Appliances operates a physical showroom paired with this digital
          exploration catalog, designed to help families and homeowners explore
          reliable home appliances with clarity before visiting our store.
        </p>

        <section aria-labelledby="about-approach-title" style={{ marginTop: "48px" }}>
          <h2 id="about-approach-title" className="sr-only">
            Our Approach & Experience
          </h2>
          <div className="info-grid">
            <div className="info-card">
              <span className="info-card-num">01 / PURPOSE</span>
              <h3 className="info-card-title">Digital Exploration</h3>
              <p className="info-card-body">
                We believe appliance shopping should be transparent and calm. Browse
                categories, understand appliance dimensions, and compare configurations
                online before making an in-person decision.
              </p>
            </div>

            <div className="info-card">
              <span className="info-card-num">02 / SHOWROOM</span>
              <h3 className="info-card-title">In-Person Verification</h3>
              <p className="info-card-body">
                Photographs and spec sheets only tell part of the story. Our physical
                showroom lets you inspect real build materials, test control dials,
                listen to operating noise levels, and verify unit dimensions.
              </p>
            </div>

            <div className="info-card">
              <span className="info-card-num">03 / INTEGRITY</span>
              <h3 className="info-card-title">Verified Information</h3>
              <p className="info-card-body">
                We avoid exaggerated claims and artificial discounts. Product
                specifications, warranty cards, and live availability are verified
                directly with our staff on the showroom floor.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-categories-title" style={{ marginTop: "64px" }}>
          <p className="info-eyebrow">Catalog Overview</p>
          <h2
            id="about-categories-title"
            style={{
              fontFamily: "var(--font-sora), sans-serif",
              fontSize: "clamp(22px, 2.2vw, 28px)",
              fontWeight: 600,
              color: "#ffffff",
              margin: "0 0 24px 0",
              letterSpacing: "-0.02em",
            }}
          >
            What You Can Explore
          </h2>

          <div className="info-grid">
            {categories.map((cat, idx) => (
              <div key={cat.slug} className="info-card">
                <span className="info-card-num">0{idx + 1} / CATEGORY</span>
                <h3 className="info-card-title">
                  {cat.name === "Home" ? "Home Appliances" : cat.name}
                </h3>
                <p className="info-card-body">
                  Subcategories include{" "}
                  {cat.subcategories.map((s) => s.name).join(", ")}.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-cta-title" className="info-cta-bar">
          <h2 id="about-cta-title" className="sr-only">
            Next Steps
          </h2>
          <Link href="/products" className="info-btn-primary">
            Explore All Products &rarr;
          </Link>
          <Link href="/#visit" className="info-btn-secondary">
            Visit Our Store
          </Link>
          <Link href="/faq" className="info-btn-secondary">
            Read FAQs
          </Link>
        </section>
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
