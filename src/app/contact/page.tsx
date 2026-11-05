import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ContactInquiryForm } from "@/components/contact-inquiry-form";
import { getPublicStoreSettings } from "@/lib/supabase-admin";
import { CopyButton } from "./copy-button";
import { SHOWROOM_LOCATION } from "@/lib/showroom-location";
import styles from "./contact.module.css";

// Read live store settings when published by admin; otherwise fallback to approved contact details
export const instant = false;
export const metadata: Metadata = {
  title: "Contact & Product Inquiries | NS Home Appliances",
  description:
    "Have a question about an appliance or showroom availability? Give us a call at 0300 6791460 or send us an inquiry.",
};

const DEFAULT_PHONE = "0300 6791460";

interface ContactPageProps {
  searchParams?: Promise<{
    product?: string;
    id?: string;
    slug?: string;
  }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = searchParams ? await searchParams : {};
  const productName = typeof params.product === "string" ? params.product : undefined;
  const productId = typeof params.id === "string" ? params.id : undefined;
  const productSlug = typeof params.slug === "string" ? params.slug : undefined;

  const settings = await getPublicStoreSettings();

  // Prefer verified store settings when published; fallback to approved authorized contact number
  const displayPhone = settings?.phone?.trim() || DEFAULT_PHONE;
  const telPhone = displayPhone.replace(/[^0-9+]/g, "") || "03006791460";

  return (
    <div className={styles.page}>
      <SiteNav homeLinks alwaysFormed />

      <main className={styles.main} id="main-content">
        <section className={styles.heroSection} aria-labelledby="contact-heading">
          {/* Small Label */}
          <p className={styles.label}>CONTACT &amp; INQUIRIES</p>

          {/* Main Heading */}
          <h1 id="contact-heading" className={styles.title}>
            {productName ? "Inquire About Appliance" : "Want to know more?"}
          </h1>

          {/* Supporting Sentence */}
          <p className={styles.supporting}>
            {productName
              ? `Have questions about ${productName}? Call our showroom or send an inquiry below.`
              : "Have a question about an appliance? Give us a call or send an inquiry below."}
          </p>

          {/* Fine Divider */}
          <div className={styles.divider} aria-hidden="true" />

          {/* Contact Block */}
          <div className={styles.contactBlock}>
            <div className={styles.phoneCluster}>
              <a
                href={`tel:${telPhone}`}
                className={styles.phoneNumber}
                aria-label={`Call ${displayPhone}`}
              >
                {displayPhone}
              </a>
              <CopyButton textToCopy={displayPhone} />
            </div>

            <div className={styles.actionRow}>
              <a
                href={`tel:${telPhone}`}
                className={styles.callButton}
                id="call-now-button"
                aria-label={`Call ${displayPhone} now`}
              >
                <svg
                  className={styles.callIcon}
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Call Now</span>
              </a>

              <a
                href={SHOWROOM_LOCATION.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.directionsButton}
                id="contact-get-directions-button"
                aria-label="Get directions to NS Home Appliances on Google Maps"
              >
                <svg
                  className={styles.directionsIcon}
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Get Directions</span>
                <span className={styles.directionsArrow} aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Contact Inquiry Form Section */}
        <section className={styles.formSection} id="inquiry-form" aria-label="Customer inquiry form">
          <ContactInquiryForm
            productName={productName}
            productId={productId}
            productSlug={productSlug}
          />
        </section>
      </main>

      <SiteFooter variant="static" />
    </div>
  );
}
