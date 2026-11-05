"use client";

import Link from "next/link";
import type { StorefrontProduct } from "@/lib/public-catalog";
import type { PublicProductReview } from "@/lib/gallery-types";
import { getAvailabilityPresentation } from "@/lib/product-availability";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProductDetailGallery } from "@/components/product-detail-gallery";
import { ProductReviews } from "@/components/product-reviews";
import styles from "./product-detail.module.css";

interface ProductDetailViewProps {
  product: StorefrontProduct;
  reviews: PublicProductReview[];
  whatsAppUrl: string;
  whatsappNumber?: string | null;
  phoneNumber?: string | null;
  isRecognizedCustomer?: boolean;
}

function formatPricePKR(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount).replace("PKR", "PKR ");
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={styles.inquireIcon}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.39C16.31 14.26 15.09 13.66 14.86 13.58C14.63 13.5 14.47 13.46 14.3 13.71C14.14 13.96 13.67 14.51 13.53 14.67C13.39 14.84 13.25 14.86 13 14.73C12.75 14.61 11.95 14.35 11 13.5C10.26 12.84 9.76 12.03 9.62 11.78C9.48 11.53 9.6 11.4 9.73 11.27C9.84 11.16 9.98 10.98 10.1 10.84C10.22 10.7 10.26 10.6 10.34 10.43C10.42 10.27 10.38 10.12 10.32 10C10.26 9.87 9.77 8.67 9.57 8.18C9.37 7.7 9.17 7.76 9.02 7.75C8.88 7.75 8.71 7.75 8.55 7.75C8.38 7.75 8.12 7.81 7.89 8.06C7.66 8.31 7.03 8.9 7.03 10.11C7.03 11.32 7.91 12.48 8.03 12.65C8.16 12.81 9.77 15.3 12.23 16.36C12.82 16.61 13.27 16.76 13.63 16.88C14.22 17.06 14.76 17.04 15.18 16.97C15.65 16.9 16.63 16.38 16.83 15.81C17.04 15.24 17.04 14.75 16.98 14.65C16.92 14.54 16.81 14.51 16.56 14.39Z" />
    </svg>
  );
}

export function ProductDetailView({
  product,
  reviews,
  whatsAppUrl,
}: ProductDetailViewProps) {
  const availability = product.availabilityStatus || "not_confirmed";
  const presentation = getAvailabilityPresentation(availability);

  const specsEntries = Object.entries(product.specifications || {}).filter(
    ([key, value]) =>
      Boolean(value) &&
      key.toLowerCase() !== "brand" &&
      key.toLowerCase() !== "model" &&
      key.toLowerCase() !== "model number",
  );

  return (
    <div className={styles.detailPage}>
      {/* Exact shared silver-glass floating capsule navbar used on /products */}
      <SiteNav alwaysFormed />

      <main className={styles.detailMain} id="main-content">
        {/* Breadcrumb Navigation */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb navigation">
          <Link href="/" className={styles.breadcrumbLink}>
            Home
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href="/products" className={styles.breadcrumbLink}>
            All Appliances
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link
            href={`/products?category=${product.categorySlug}`}
            className={styles.breadcrumbLink}
          >
            {product.category}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent} aria-current="page">
            {product.name}
          </span>
        </nav>

        {/* Top 2-Column Hero Grid: Left Gallery + Right Information & Inquire Action */}
        <section className={styles.productHeroGrid}>
          {/* Left Column: Interactive Multi-Image and Video Gallery */}
          <div className={styles.galleryColumn}>
            <ProductDetailGallery
              images={product.galleryImages}
              productName={product.name}
            />
          </div>

          {/* Right Column: Clean Essential Product Information */}
          <div className={styles.infoColumn}>
            {/* Header: Category Badge + Genuine Availability Status Badge */}
            <div className={styles.metaRow}>
              <Link
                href={`/products?category=${product.categorySlug}`}
                className={styles.categoryBadge}
              >
                {product.category}
              </Link>
              <span
                className={`${styles.availabilityBadge} ${styles[presentation.badgeClassName]}`}
              >
                {presentation.badgeLabel}
              </span>
            </div>

            <h1 className={styles.productTitle}>{product.name}</h1>

            {(product.brand || product.modelNumber) && (
              <div className={styles.brandModelRow}>
                {product.brand && (
                  <span className={styles.brandBadge}>{product.brand}</span>
                )}
                {product.brand && product.modelNumber && <span>·</span>}
                {product.modelNumber && (
                  <span className={styles.modelNumber}>
                    Model: {product.modelNumber}
                  </span>
                )}
              </div>
            )}

            {/* Editorial Price Presentation */}
            <div className={styles.priceSection}>
              <span className={styles.priceLabel}>Showroom Price</span>
              {product.pricePkr !== null ? (
                <div className={styles.priceValue}>
                  {formatPricePKR(product.pricePkr)}
                </div>
              ) : (
                <div className={styles.inquiryText}>
                  Price confirmed upon showroom visit
                </div>
              )}
            </div>

            {/* Primary Action: Direct Inquire on WhatsApp CTA */}
            <div className={styles.actionSection}>
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryInquireButton}
                id="inquire-product-button"
                aria-label={`Inquire about ${product.name} on WhatsApp`}
              >
                <WhatsAppIcon />
                <span>Inquire on WhatsApp</span>
              </a>

              <p className={styles.reassuranceText}>
                Direct showroom chat on WhatsApp · Fast response regarding pricing &amp; showroom availability
              </p>
            </div>
          </div>
        </section>

        {/* Content Deck Below Fold */}
        <div className={styles.contentDeck}>
          {/* Section 1: About This Product */}
          {product.description && (
            <section className={styles.descriptionSection} aria-labelledby="about-heading">
              <h2 id="about-heading" className={styles.sectionHeading}>
                About This Product
              </h2>
              <p className={styles.descriptionParagraph}>{product.description}</p>
            </section>
          )}

          {/* Section 2: Technical Specifications */}
          {specsEntries.length > 0 && (
            <section className={styles.specificationsSection} aria-labelledby="specs-heading">
              <h2 id="specs-heading" className={styles.sectionHeading}>
                Technical Specifications
              </h2>
              <div className={styles.specsTableWrap}>
                <table className={styles.specsTable}>
                  <tbody>
                    {specsEntries.map(([key, value]) => (
                      <tr key={key} className={styles.specsRow}>
                        <th scope="row" className={styles.specsKey}>
                          {key}
                        </th>
                        <td className={styles.specsValue}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 3: Redesigned Customer Reviews (Compact & Polished) */}
          <ProductReviews
            productId={product.id}
            productSlug={product.slug}
            productName={product.name}
            initialReviews={reviews}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
