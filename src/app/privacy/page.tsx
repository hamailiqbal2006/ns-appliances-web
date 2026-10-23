import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | NS Home Appliances",
  description:
    "Learn about privacy practices and data handling at NS Home Appliances — honest, client-side exploration without third-party tracking cookies.",
};

export default function PrivacyPage() {
  return (
    <div className="info-page">
      <SiteNav detail />
      <main className="info-main" id="main-content">
        <p className="info-eyebrow">Data & Transparency</p>
        <h1 className="info-title">Privacy Policy</h1>
        <p className="info-lead">
          NS Home Appliances values your privacy. This policy describes how our digital
          showroom and store operations handle information with transparency and respect.
        </p>

        <section
          aria-labelledby="privacy-sections-title"
          style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "40px" }}
        >
          <h2 id="privacy-sections-title" className="sr-only">
            Policy Details
          </h2>

          <article className="info-card">
            <span className="info-card-num">SECTION 01</span>
            <h3 className="info-card-title">Client-Side Catalog Browsing</h3>
            <p className="info-card-body">
              Our website is built primarily for private, client-side exploration.
              When you search our catalog using English or Roman Urdu keywords (such as
              &apos;dhulai&apos; or &apos;pankha&apos;), the search runs entirely inside
              your local web browser against an embedded catalog index. We do not log
              your search queries to building customer tracking profiles.
            </p>
          </article>

          <article className="info-card">
            <span className="info-card-num">SECTION 02</span>
            <h3 className="info-card-title">Cookies and Storage</h3>
            <p className="info-card-body">
              We do not use invasive advertising cookies, third-party tracking pixels,
              or cross-site analytics scripts. Essential browser storage may be used
              only for interface preferences, such as respecting your motion reduction
              settings or caching static assets for smooth scrolling.
            </p>
          </article>

          <article className="info-card">
            <span className="info-card-num">SECTION 03</span>
            <h3 className="info-card-title">Showroom Inquiries & Order Details</h3>
            <p className="info-card-body">
              If you visit our showroom or contact us directly to inquire about an
              appliance, any contact information you provide (such as your name,
              phone number, or delivery address) is used solely to coordinate your
              order, verify product availability, and manage warranty services. We do
              not sell, rent, or share customer contact records with external marketers.
            </p>
          </article>

          <article className="info-card">
            <span className="info-card-num">SECTION 04</span>
            <h3 className="info-card-title">Technical Hosting & Server Logs</h3>
            <p className="info-card-body">
              Like any web application hosted on modern cloud infrastructure, our
              hosting platform may record temporary technical server logs (including IP
              address, browser user agent, and timestamp) strictly for network security,
              fraud prevention, and uptime reliability.
            </p>
          </article>

          <article className="info-card">
            <span className="info-card-num">SECTION 05</span>
            <h3 className="info-card-title">Policy Inquiries</h3>
            <p className="info-card-body">
              As NS Home Appliances introduces additional digital capabilities (such
              as authenticated accounts or digital reservation confirmations), this
              policy will be updated to reflect exact workflows. If you have questions
              about how your data is handled, please visit our showroom or contact us.
            </p>
          </article>
        </section>

        <section aria-labelledby="privacy-cta-title" className="info-cta-bar">
          <h2 id="privacy-cta-title" className="sr-only">
            Navigation Actions
          </h2>
          <Link href="/products" className="info-btn-primary">
            Explore All Products &rarr;
          </Link>
          <Link href="/about" className="info-btn-secondary">
            About Our Store
          </Link>
          <Link href="/faq" className="info-btn-secondary">
            FAQs
          </Link>
        </section>
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
