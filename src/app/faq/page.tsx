import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { FaqAccordion } from "@/components/faq-accordion";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | NS Home Appliances",
  description:
    "Find answers about browsing appliances, showroom visits, in-store purchases, and search capabilities at NS Home Appliances.",
};

export default function FaqPage() {
  return (
    <div className="info-page">
      <SiteNav detail />
      <main className="info-main" id="main-content">
        <p className="info-eyebrow">Help & Guidance</p>
        <h1 className="info-title">Frequently Asked Questions</h1>
        <p className="info-lead">
          Clear, straightforward answers about our website catalog, product
          availability, Roman Urdu search, and showroom visits.
        </p>

        <section aria-labelledby="faq-section-title">
          <h2 id="faq-section-title" className="sr-only">
            Questions and Answers
          </h2>
          <FaqAccordion />
        </section>

        <section aria-labelledby="faq-cta-title" className="info-cta-bar">
          <h2 id="faq-cta-title" className="sr-only">
            Still Have Questions?
          </h2>
          <Link href="/contact" className="info-btn-primary">
            Contact Showroom &rarr;
          </Link>
          <Link href="/products" className="info-btn-secondary">
            Browse All Products
          </Link>
          <Link href="/about" className="info-btn-secondary">
            About Our Store
          </Link>
        </section>
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
