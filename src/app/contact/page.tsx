import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Contact Us & Showroom Visit | NS Home Appliances",
  description:
    "Contact NS Home Appliances or visit our physical showroom to inspect home appliances in person.",
};

export default function ContactPage() {
  return (
    <div className="info-page">
      <SiteNav detail />
      <main className="info-main" id="main-content">
        <p className="info-eyebrow">NS Home Appliances · Showroom Inquiries</p>
        <h1 className="info-title">Contact & Visit Our Store</h1>
        <p className="info-lead">
          We welcome customers to visit our physical showroom to compare appliances,
          verify dimensions, and receive guidance from our store specialists.
        </p>

        <section aria-labelledby="contact-options-title" style={{ marginTop: "40px" }}>
          <h2 id="contact-options-title" className="sr-only">
            Showroom Guidance and Communication
          </h2>
          <div className="info-grid">
            <div className="info-card">
              <span className="info-card-num">01 / IN-PERSON VISIT</span>
              <h3 className="info-card-title">Physical Showroom</h3>
              <p className="info-card-body">
                The most reliable way to experience appliances is in person. Walk
                through our displays, check build finishes, and speak directly with
                our team about availability and specifications.
              </p>
              <div style={{ marginTop: "18px" }}>
                <Link
                  href="/#visit"
                  className="footer-nav-link"
                  style={{ color: "#ffffff", fontWeight: 500 }}
                >
                  View Visit Section &rarr;
                </Link>
              </div>
            </div>

            <div className="info-card">
              <span className="info-card-num">02 / CONSULTATIONS</span>
              <h3 className="info-card-title">Product Advice</h3>
              <p className="info-card-body">
                Need guidance on room cooler capacity, washing machine load sizing,
                or geyser volume? Our showroom staff assists you with room-specific
                recommendations during your visit.
              </p>
              <div style={{ marginTop: "18px" }}>
                <Link
                  href="/products"
                  className="footer-nav-link"
                  style={{ color: "#ffffff", fontWeight: 500 }}
                >
                  Browse Catalog &rarr;
                </Link>
              </div>
            </div>

            <div className="info-card">
              <span className="info-card-num">03 / VERIFIED CHANNELS</span>
              <h3 className="info-card-title">Direct Inquiries</h3>
              <p className="info-card-body">
                Official phone, messaging, and email lines are currently being
                finalized for digital customer coordination. We prioritize verified
                human communication over unmonitored online forms.
              </p>
              <div style={{ marginTop: "18px" }}>
                <Link
                  href="/faq"
                  className="footer-nav-link"
                  style={{ color: "#ffffff", fontWeight: 500 }}
                >
                  Read Common FAQs &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="contact-notice-title"
          style={{
            marginTop: "48px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "clamp(24px, 3vw, 36px)",
          }}
        >
          <h2
            id="contact-notice-title"
            style={{
              fontFamily: "var(--font-sora), sans-serif",
              fontSize: "18px",
              fontWeight: 600,
              color: "#ffffff",
              margin: "0 0 10px 0",
            }}
          >
            Planning Your Showroom Visit
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sora), sans-serif",
              fontSize: "14px",
              lineHeight: 1.6,
              color: "rgba(245, 244, 239, 0.72)",
              margin: 0,
              maxWidth: "760px",
            }}
          >
            Before visiting, you can search our catalog or explore our category
            showcase to note model kinds that interest you. Our team will verify
            specifications and current floor availability with you on site.
          </p>
        </section>

        <section aria-labelledby="contact-cta-title" className="info-cta-bar">
          <h2 id="contact-cta-title" className="sr-only">
            Actions
          </h2>
          <Link href="/#visit" className="info-btn-primary">
            Visit Our Store &rarr;
          </Link>
          <Link href="/products" className="info-btn-secondary">
            Explore All Products
          </Link>
          <Link href="/about" className="info-btn-secondary">
            About NS Home Appliances
          </Link>
        </section>
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
