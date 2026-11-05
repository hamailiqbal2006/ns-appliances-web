"use client";

import Image from "next/image";
import Link from "next/link";
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
 *  - Centered floating appliance image with containment and subtle hover zoom
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

            <ProductImageCanvas
              image={product.image}
              name={product.name}
              className={styles.cardImage}
              priority={priority}
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

          <ProductImageCanvas
            image={product.image}
            name={product.name}
            className={styles.cardImage}
            priority={priority}
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
 * When no image exists, renders a discreet, neutral icon without text.
 */
export function ProductImageCanvas({
  image,
  name,
  className,
  priority = false,
}: {
  image: string | null;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  if (image) {
    if (image.startsWith("/")) {
      return (
        <div className={styles.imageInnerWrap}>
          <Image
            src={image}
            alt={name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 400px"
            className={className}
            style={{ objectFit: "contain" }}
          />
        </div>
      );
    }

    return (
      <div className={styles.imageInnerWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          className={className}
          loading={priority ? "eager" : "lazy"}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
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
