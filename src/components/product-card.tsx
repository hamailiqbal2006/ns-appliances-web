"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { motion } from "motion/react";
import type { StorefrontProduct } from "@/lib/public-catalog";
import styles from "./product-card.module.css";

export interface ProductCardProps {
  product: StorefrontProduct;
  index?: number;
  priority?: boolean;
  variant?: "standard" | "featured";
}

/**
 * Reference-Accurate Luxury Product Card
 * Composition:
 *  - Warm neutral canvas (#EDEBE7)
 *  - Top-left category badge (#D9D6D0 capsule)
 *  - Centered floating appliance image with containment, prominent sizing & hover crossfade
 *  - Inset compact white information strip (#FAF9F7) with readable typography & circular arrow
 */
export function ProductCard({
  product,
  index = 0,
  priority = false,
  variant = "standard",
}: ProductCardProps) {
  const isFeatured = variant === "featured";
  const categoryLabel = product.category || "Appliance";

  const formattedPrice =
    product.pricePkr !== null
      ? `PKR ${new Intl.NumberFormat("en-PK").format(product.pricePkr)}`
      : "Inquire for Price";

  // Resolve secondary distinct gallery image for desktop hover crossfade
  const secondaryImage = useMemo(() => {
    if (!product.galleryImages || product.galleryImages.length <= 1) return null;
    const secondary = product.galleryImages.find(
      (img) => img.mediaType !== "video" && img.url && img.url !== product.image,
    );
    return secondary?.url ?? null;
  }, [product.galleryImages, product.image]);

  if (isFeatured) {
    return (
      <motion.div
        className={styles.featuredWrapper}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -30px 0px" }}
        transition={{
          duration: 0.38,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <Link
          href={`/products/${product.slug}`}
          className={styles.featuredVerticalCard}
          aria-label={`${product.name} - ${formattedPrice}`}
        >
          {/* Upper visual area with floating image canvas and category badge */}
          <div className={styles.featuredCanvasStage}>
            <span className={styles.categoryBadge}>{categoryLabel}</span>

            {secondaryImage && (
              <div
                className={styles.galleryIndicator}
                aria-hidden="true"
                title="Multiple views available"
              >
                <span className={styles.indicatorDot} />
                <span className={styles.indicatorDot} />
              </div>
            )}

            <ProductImageCanvas
              image={product.image}
              secondaryImage={secondaryImage}
              name={product.name}
              className={styles.cardImage}
              priority={priority}
              artScale={product.art?.scale}
            />
          </div>

          {/* Integrated compact white information strip */}
          <div className={styles.featuredInfoStrip}>
            <div className={styles.infoContent}>
              <h2 className={styles.featuredTitle}>{product.name}</h2>
              <span className={styles.featuredPrice}>{formattedPrice}</span>
            </div>

            <div className={styles.featuredArrowCircle} aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.arrowSvg}
              >
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Standard Reference-Style Grid Card
  return (
    <motion.div
      className={styles.gridItem}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -30px 0px" }}
      transition={{
        duration: 0.38,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.04, 0.22),
      }}
    >
      <Link
        href={`/products/${product.slug}`}
        className={styles.productCard}
        aria-label={`${product.name} - ${formattedPrice}`}
      >
        {/* Upper visual area with floating image canvas and category badge */}
        <div className={styles.cardCanvasStage}>
          <span className={styles.categoryBadge}>{categoryLabel}</span>

          {secondaryImage && (
            <div
              className={styles.galleryIndicator}
              aria-hidden="true"
              title="Multiple views available"
            >
              <span className={styles.indicatorDot} />
              <span className={styles.indicatorDot} />
            </div>
          )}

          <ProductImageCanvas
            image={product.image}
            secondaryImage={secondaryImage}
            name={product.name}
            className={styles.cardImage}
            priority={priority}
            artScale={product.art?.scale}
          />
        </div>

        {/* Integrated compact white information strip */}
        <div className={styles.infoStrip}>
          <div className={styles.infoContent}>
            <h3 className={styles.cardTitle}>{product.name}</h3>
            <span className={styles.cardPrice}>{formattedPrice}</span>
          </div>

          <div className={styles.arrowCircle} aria-hidden="true">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.arrowSvg}
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * Editorial Featured Single-Product Card
 * Maps directly to ProductCard with variant="featured".
 */
export function FeaturedProductCard({ product }: { product: StorefrontProduct }) {
  return <ProductCard product={product} variant="featured" priority />;
}

/**
 * Product Image Canvas
 * Displays verified product cutouts with proper containment.
 * Supports desktop hover crossfade to secondary gallery image without layout shifts.
 */
export function ProductImageCanvas({
  image,
  secondaryImage,
  name,
  className,
  priority = false,
  artScale,
}: {
  image: string | null;
  secondaryImage?: string | null;
  name: string;
  className?: string;
  priority?: boolean;
  artScale?: number;
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  if (image) {
    const hasSecondary = Boolean(secondaryImage);

    // Studio square/wide photos (aspectRatio >= 0.85) have horizontal/vertical studio margins:
    // apply smart framing scale (1.15) to fill ~90% of visual canvas without clipping dials/feet.
    // Tall portrait cutouts (aspectRatio < 0.85) already occupy full height: scale remains 1.0.
    // When aspectRatio is not yet known (before image load / SSR), default to 1.15 for managed URLs or 1.0 for known portrait temp paths.
    const isTempPortrait = typeof image === "string" && image.includes("/products/temp/");
    const isSquareOrWide = aspectRatio !== null ? aspectRatio >= 0.85 : !isTempPortrait;
    const effectiveScale =
      artScale && artScale !== 1.0
        ? artScale
        : isSquareOrWide
          ? 1.15
          : 1.0;

    return (
      <div
        className={styles.imageInnerWrap}
        style={{ "--product-scale": effectiveScale } as React.CSSProperties}
      >
        {image.startsWith("/") ? (
          <Image
            src={image}
            alt={name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
            className={`${className || ""} ${styles.cardImage} ${styles.cardImagePrimary} ${hasSecondary ? styles.hasSecondary : ""}`}
            style={{ objectFit: "contain" }}
            onLoad={handleImageLoad}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className={`${className || ""} ${styles.cardImage} ${styles.cardImagePrimary} ${hasSecondary ? styles.hasSecondary : ""}`}
            loading={priority ? "eager" : "lazy"}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onLoad={handleImageLoad}
          />
        )}

        {secondaryImage &&
          (secondaryImage.startsWith("/") ? (
            <Image
              src={secondaryImage}
              alt={`${name} — alternate showcase view`}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
              className={`${className || ""} ${styles.cardImage} ${styles.cardImageSecondary}`}
              style={{ objectFit: "contain" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={secondaryImage}
              alt={`${name} — alternate showcase view`}
              className={`${className || ""} ${styles.cardImage} ${styles.cardImageSecondary}`}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ))}
      </div>
    );
  }

  return (
    <div className={styles.missingImageCanvas}>
      <div className={styles.missingImageGlyph} aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    </div>
  );
}
