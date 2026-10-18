"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories, products } from "@/data/catalog";
import { SiteNav } from "@/components/site-nav";
import { HeroDistortion } from "@/components/hero-distortion";
import { SiteIntro } from "@/components/site-intro";

gsap.registerPlugin(ScrollTrigger);

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

export interface HeroBannerSlide {
  id: string;
  tabLabel: string;
  titleLine1: string;
  titleLine2: string;
  isAccentItalic: boolean;
  tagline: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    ambientClass: string;
  };
}

export const heroBanners: HeroBannerSlide[] = [
  {
    id: "brand",
    tabLabel: "Showroom",
    titleLine1: "NS Home",
    titleLine2: "Appliances",
    isAccentItalic: true,
    tagline:
      "Objects of quiet performance and architectural simplicity, thoughtfully curated for modern everyday living.",
    palette: {
      primary: "rgba(142, 178, 126, 0.32)",
      secondary: "rgba(68, 138, 125, 0.22)",
      accent: "rgba(225, 238, 200, 0.28)",
      ambientClass: "hero-ambient-slide-1",
    },
  },
  {
    id: "climate",
    tabLabel: "Climate",
    titleLine1: "Atmospheric",
    titleLine2: "Equilibrium",
    isAccentItalic: true,
    tagline:
      "Aerodynamic stillness and instant thermal precision engineered to harmonize silently with contemporary interiors.",
    palette: {
      primary: "rgba(110, 185, 205, 0.30)",
      secondary: "rgba(42, 115, 130, 0.22)",
      accent: "rgba(195, 235, 245, 0.26)",
      ambientClass: "hero-ambient-slide-2",
    },
  },
  {
    id: "utility",
    tabLabel: "Utility",
    titleLine1: "Everyday Craft",
    titleLine2: "Precision Care",
    isAccentItalic: false,
    tagline:
      "High-torque culinary extraction and fabric-protecting laundry care, engineered for generational endurance.",
    palette: {
      primary: "rgba(205, 165, 110, 0.28)",
      secondary: "rgba(125, 95, 60, 0.20)",
      accent: "rgba(245, 225, 185, 0.24)",
      ambientClass: "hero-ambient-slide-3",
    },
  },
];

const BANNER_DURATION = 5200; // 5.2 seconds per slide
const PROGRESS_TICK = 50;

export function HomeExperience() {
  const root = useRef<HTMLDivElement>(null);
  const categoryTrack = useRef<HTMLElement>(null);
  const productTrack = useRef<HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // 3-Banner Rotating Hero state
  const [activeBanner, setActiveBanner] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [navbarRevealed, setNavbarRevealed] = useState(false);
  const [introActive, setIntroActive] = useState(true);

  const selectBanner = useCallback((index: number) => {
    setActiveBanner(index);
    setProgress(0);
  }, []);

  const revealNavbar = useCallback(() => setNavbarRevealed(true), []);
  const completeIntro = useCallback(() => setIntroActive(false), []);

  const nextBanner = useCallback(() => {
    setActiveBanner((curr) => (curr + 1) % heroBanners.length);
    setProgress(0);
  }, []);

  // Autoplay timer with pause on hover
  useEffect(() => {
    if (shouldReduceMotion || isBannerPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (PROGRESS_TICK / BANNER_DURATION) * 100;
        if (next >= 100) {
          nextBanner();
          return 0;
        }
        return next;
      });
    }, PROGRESS_TICK);

    return () => clearInterval(timer);
  }, [isBannerPaused, shouldReduceMotion, nextBanner]);

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
    <div className={`showroom${introActive ? " intro-active" : ""}`} ref={root}>
      <SiteNav introReady={navbarRevealed} />
      <main>
        {/* REFINED 3-BANNER ROTATING HERO */}
        <section
          className="hero-track"
          aria-label="NS Home Appliances showroom introduction"
          onMouseEnter={() => setIsBannerPaused(true)}
          onMouseLeave={() => setIsBannerPaused(false)}
        >
          <div className="hero-stage">
            {/* Atmospheric Background Layers */}
            <div
              className={`hero-ambient ${currentBanner.palette.ambientClass}`}
              aria-hidden="true"
            />
            <div className="hero-grain" aria-hidden="true" />

            {/* Interactive Liquid Cursor Distortion Engine (Banner only, desktop fine pointer) */}
            <HeroDistortion activePalette={currentBanner.palette} />

            <span id="hero-title" className="sr-only">
              NS Home Appliances Showroom
            </span>

            {/* Main Editorial Hero Slide Content */}
            <div className="hero-editorial-stage">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBanner.id}
                  className="hero-slide-content"
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 16, filter: "blur(3px)" }
                  }
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0, y: -16, filter: "blur(3px)" }
                  }
                  transition={{
                    duration: shouldReduceMotion ? 0.001 : 0.62,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Grand Editorial Headline */}
                  <h1 className="hero-banner-title">
                    <span className="hero-title-line">
                      {currentBanner.titleLine1}
                    </span>
                    <span
                      className={`hero-title-line ${
                        currentBanner.isAccentItalic ? "hero-title-accent" : ""
                      }`}
                    >
                      {currentBanner.titleLine2}
                    </span>
                  </h1>

                  {/* Refined Subtitle */}
                  <p className="hero-banner-tagline">
                    {currentBanner.tagline}
                  </p>

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom dock preserves access to the three-banner rotation. */}
            <div className="hero-bottom-dock">
              <div
                className="hero-slider-dock"
                role="tablist"
                aria-label="Hero banner slides"
              >
                {heroBanners.map((banner, index) => {
                  const isActive = activeBanner === index;
                  return (
                    <button
                      key={banner.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Show ${banner.tabLabel} banner`}
                      className={`hero-dock-tab ${isActive ? "is-active" : ""}`}
                      onClick={() => selectBanner(index)}
                    >
                      <div className="hero-dock-tab-header">
                        <span className="hero-dock-tab-title">{banner.tabLabel}</span>
                      </div>
                      <div className="hero-dock-progress-track">
                        <div
                          className="hero-dock-progress-bar"
                          style={{
                            width: isActive
                              ? `${shouldReduceMotion ? 100 : progress}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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
      <SiteIntro onNavbarReveal={revealNavbar} onComplete={completeIntro} />
    </div>
  );
}
