"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories, products } from "@/data/catalog";
import { SiteNav } from "@/components/site-nav";
import { HeroDistortion } from "@/components/hero-distortion";

gsap.registerPlugin(ScrollTrigger);

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

export interface HeroBannerSlide {
  id: string;
  className: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const heroBanners: HeroBannerSlide[] = [
  {
    id: "brand",
    className: "hero-ambient-slide-1",
    palette: {
      primary: "rgba(142, 178, 126, 0.32)",
      secondary: "rgba(68, 138, 125, 0.22)",
      accent: "rgba(225, 238, 200, 0.28)",
    },
  },
  {
    id: "climate",
    className: "hero-ambient-slide-2",
    palette: {
      primary: "rgba(110, 185, 205, 0.30)",
      secondary: "rgba(42, 115, 130, 0.22)",
      accent: "rgba(195, 235, 245, 0.26)",
    },
  },
  {
    id: "utility",
    className: "hero-ambient-slide-3",
    palette: {
      primary: "rgba(205, 165, 110, 0.28)",
      secondary: "rgba(125, 95, 60, 0.20)",
      accent: "rgba(245, 225, 185, 0.24)",
    },
  },
];

const BANNER_DURATION = 5500; // 5.5s automatic continuous rotation

export function HomeExperience() {
  const root = useRef<HTMLDivElement>(null);
  const categoryTrack = useRef<HTMLElement>(null);
  const productTrack = useRef<HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Exactly 3 automatic rotating banners
  const [activeBanner, setActiveBanner] = useState(0);

  // Automatic continuous loop: Banner 1 -> Banner 2 -> Banner 3 -> Banner 1
  useEffect(() => {
    if (shouldReduceMotion) return;

    const timer = setInterval(() => {
      setActiveBanner((curr) => (curr + 1) % heroBanners.length);
    }, BANNER_DURATION);

    return () => clearInterval(timer);
  }, [shouldReduceMotion]);

  // GSAP ScrollTrigger setup for category and product showcase sections below hero
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const indexFrom = (p: number, size: number) =>
        Math.min(size - 1, Math.floor(p * size + 0.0001));
      if (categoryTrack.current)
        ScrollTrigger.create({
          trigger: categoryTrack.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: ({ progress: p }) =>
            setActiveCategory(indexFrom(p, categories.length)),
        });
      if (productTrack.current)
        ScrollTrigger.create({
          trigger: productTrack.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: ({ progress: p }) =>
            setActiveProduct(indexFrom(p, products.length)),
        });
    }, root);
    return () => context.revert();
  }, []);

  const category = categories[activeCategory];
  const product = products[activeProduct];
  const currentBanner = heroBanners[activeBanner];

  return (
    <div className="showroom" ref={root}>
      <SiteNav />
      <main>
        {/* THREE AUTOMATIC FULL-SCREEN BANNERS (CLEAN, NO TEXT CLUTTER) */}
        <section
          className="hero-track"
          aria-label="NS Home Appliances showroom introduction"
        >
          <div className="hero-stage">
            {/* Atmospheric Background Layers with smooth crossfade */}
            <div className="hero-banners" aria-hidden="true">
              {heroBanners.map((banner, index) => {
                const isActive = activeBanner === index;
                return (
                  <div
                    key={banner.id}
                    className={`hero-ambient hero-banner-layer ${banner.className} ${isActive ? "is-active" : ""}`}
                    style={{
                      opacity: isActive ? 1 : 0,
                      zIndex: isActive ? 2 : 1,
                      transition: shouldReduceMotion
                        ? "none"
                        : "opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                );
              })}
            </div>

            {/* Subtle grain texture overlay */}
            <div className="hero-grain" aria-hidden="true" />

            {/* Interactive Liquid Cursor Distortion Engine (Banner only, desktop fine pointer) */}
            <HeroDistortion activePalette={currentBanner.palette} />

            {/* Semantic heading for SEO / Screen Readers (No visual text clutter) */}
            <h1 id="hero-title" className="sr-only">
              NS Home Appliances — Digital Showroom
            </h1>
          </div>
        </section>

        {/* SHOP BY CATEGORY SECTION (UNTOUCHED) */}
        <section className="category-intro cover-panel" aria-labelledby="category-intro-title">
          <div className="intro-sticky">
            <p className="eyebrow">01 / discover by room</p>
            <h2 id="category-intro-title">
              Shop by<br />
              <em>Category</em>
            </h2>
            <p>Objects for a calmer, more capable home.</p>
            <span className="intro-arrow" aria-hidden>
              ↓
            </span>
          </div>
        </section>

        <section
          id="categories"
          className="category-track cover-panel"
          ref={categoryTrack}
          aria-label="Shop by category"
          style={{ height: `${categories.length * 105}svh` }}
        >
          <div
            className="category-scene"
            style={css({
              "--scene-base": category.palette.base,
              "--scene-panel": category.palette.panel,
              "--scene-ink": category.palette.ink,
            })}
          >
            <div className="category-left">
              <p className="scene-number">0{activeCategory + 1} / 04</p>
              <h2>{category.name}</h2>
              <p className="category-signal">Scroll-led selection</p>
            </div>
            <div className="category-cutout">
              <Image
                key={category.slug}
                src={category.image}
                alt={`Temporary ${category.name} appliance cutout`}
                fill
                sizes="(max-width: 760px) 85vw, 46vw"
                style={{
                  objectFit: "contain",
                  transform: `translate(${category.art.x}%, ${category.art.y}%) scale(${category.art.scale}) rotate(${category.art.rotation ?? 0}deg)`,
                }}
              />
            </div>
            <div className="category-right">
              <p className="eyebrow">Explore</p>
              <ul>
                {category.subcategories.map((sub, index) => (
                  <li key={sub.slug}>
                    <Link href={`/category/${category.slug}/${sub.slug}`}>
                      <span>0{index + 1}</span>
                      {sub.name}
                      <b>↗</b>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="temporary-note">Temporary cutout / final NS product image to replace</p>
            </div>
            <div className="scene-dots" aria-hidden>
              {categories.map((_, index) => (
                <i key={index} className={index === activeCategory ? "active" : ""} />
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE TRACK (UNTOUCHED) */}
        <section
          id="products"
          className="products-track cover-panel"
          ref={productTrack}
          aria-labelledby="products-heading"
          style={{ height: `${products.length * 110}svh` }}
        >
          <div
            className="product-scene"
            style={css({
              "--product-base": product.palette.base,
              "--product-panel": product.palette.panel,
              "--product-ink": product.palette.ink,
              "--product-accent": product.palette.accent,
            })}
          >
            <div className="product-visual">
              <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
                <Image
                  key={product.slug}
                  src={product.image}
                  alt={`Temporary ${product.name} cutout`}
                  fill
                  sizes="(max-width: 760px) 85vw, 52vw"
                  style={{
                    objectFit: "contain",
                    transform: `translate(${product.art.x}%, ${product.art.y}%) scale(${product.art.scale}) rotate(${product.art.rotation ?? 0}deg)`,
                  }}
                />
              </Link>
            </div>
            <div className="product-info">
              <p className="eyebrow">02 / product {String(activeProduct + 1).padStart(2, "0")}</p>
              <p className="product-kind">{product.kind}</p>
              <h2 id="products-heading">{product.name}</h2>
              <p>{product.note}</p>
              <Link className="view-product" href={`/products/${product.slug}`}>
                View product <span>↗</span>
              </Link>
            </div>
            <div className="product-pagination" aria-label="Product sequence">
              {products.map((item, index) => (
                <button
                  onClick={() =>
                    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })
                  }
                  key={item.slug}
                  className={index === activeProduct ? "active" : ""}
                  aria-label={`Product ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* VISIT PANEL (UNTOUCHED) */}
        <section id="visit" className="visit-panel cover-panel">
          <p className="eyebrow">03 / next step</p>
          <h2>
            See it<br />
            <em>in person.</em>
          </h2>
          <p>
            This digital showroom is ready for real inventory, model information, booking contact
            details and the final NS Appliances photography.
          </p>
          <a href="#hero-title">
            Back to top <span>↑</span>
          </a>
        </section>
      </main>
    </div>
  );
}
