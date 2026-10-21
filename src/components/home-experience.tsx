"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, Fragment } from "react";
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
  const categoryCover = useRef<HTMLElement>(null);
  const coverEditorialBody = useRef<HTMLDivElement>(null);
  const coverHeading = useRef<HTMLHeadingElement>(null);
  const coverHeadingInteractive = useRef<HTMLSpanElement>(null);
  const coverTagline = useRef<HTMLParagraphElement>(null);
  const coverSettleLine = useRef<HTMLDivElement>(null);
  const productTrack = useRef<HTMLElement>(null);
  const [activeProduct, setActiveProduct] = useState(0);
  const [isHeroInteractive, setIsHeroInteractive] = useState(true);
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

  // App Router hydration can occur after the browser's initial hash lookup.
  // Re-apply only the Product anchor once the complete layered stack exists;
  // category sheets intentionally manage their own sticky handoff positions.
  useEffect(() => {
    const scrollToHashTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id !== "products") return;

      document.getElementById(id)?.scrollIntoView();
    };

    let frameId = 0;
    if (window.location.hash) {
      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(scrollToHashTarget);
      });
    }

    window.addEventListener("hashchange", scrollToHashTarget);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("hashchange", scrollToHashTarget);
    };
  }, []);

  // Subtle cursor-responsive movement for the Shop by Category heading
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || prefersReduced) return;

    const coverEl = categoryCover.current;
    const targetEl = coverHeadingInteractive.current;
    if (!coverEl || !targetEl) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;

    const MAX_DISPLACEMENT = 10; // Subtly within the 8–12px specification
    const DAMPING = 0.10; // Smooth, damped spring-like lerp

    const animate = () => {
      currentX += (targetX - currentX) * DAMPING;
      currentY += (targetY - currentY) * DAMPING;

      const diffX = targetX - currentX;
      const diffY = targetY - currentY;

      if (Math.abs(diffX) < 0.04 && Math.abs(diffY) < 0.04) {
        currentX = targetX;
        currentY = targetY;
        targetEl.style.transform =
          currentX === 0 && currentY === 0
            ? ""
            : `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
        rafId = null;
        return;
      }

      targetEl.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      rafId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(animate);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = targetEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      const radius = Math.max(window.innerWidth * 0.45, 450);
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const falloff = 1 - Math.pow(dist / radius, 1.5);
        const moveX = (dx / (radius * 0.5)) * MAX_DISPLACEMENT * falloff;
        const moveY = (dy / (radius * 0.5)) * MAX_DISPLACEMENT * falloff;

        targetX = Math.max(-MAX_DISPLACEMENT, Math.min(MAX_DISPLACEMENT, moveX));
        targetY = Math.max(-MAX_DISPLACEMENT, Math.min(MAX_DISPLACEMENT, moveY));
      } else {
        targetX = 0;
        targetY = 0;
      }

      startAnimation();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      startAnimation();
    };

    coverEl.addEventListener("pointermove", onPointerMove, { passive: true });
    coverEl.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      coverEl.removeEventListener("pointermove", onPointerMove);
      coverEl.removeEventListener("pointerleave", onPointerLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [shouldReduceMotion]);

  // Synchronize cover editorial elements with page-over-page entrance scroll
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      if (categoryCover.current) {
        // Initial seam prevention at scroll position 0
        if (window.scrollY <= 5) {
          categoryCover.current.style.visibility = "hidden";
        }

        let heroIsCovered = false;
        const setHeroCovered = (covered: boolean) => {
          if (heroIsCovered === covered) return;
          heroIsCovered = covered;
          setIsHeroInteractive(!covered);
        };

        const coverTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: categoryCover.current,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: ({ progress }) => {
              setHeroCovered(progress > 0.85);
              if (categoryCover.current) {
                categoryCover.current.style.visibility = progress <= 0 ? "hidden" : "visible";
              }
            },
          },
        });

        // Heading: begins slightly lower with reduced opacity, settles smoothly
        if (coverHeading.current) {
          coverTimeline.fromTo(
            coverHeading.current,
            { autoAlpha: 0.2, y: 30 },
            { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" },
            0.15
          );
        }

        // Tagline: follows with a restrained stagger, settles before cover finishes
        if (coverTagline.current) {
          coverTimeline.fromTo(
            coverTagline.current,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
            0.28
          );
        }

        // Settle line: subtle expand, finishes before settled hold
        if (coverSettleLine.current) {
          coverTimeline.fromTo(
            coverSettleLine.current,
            { autoAlpha: 0, scaleX: 0.2 },
            { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
            0.42
          );
        }
      }

      const indexFrom = (p: number, size: number) =>
        Math.min(size - 1, Math.floor(p * size + 0.0001));

      if (productTrack.current) {
        ScrollTrigger.create({
          trigger: productTrack.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: ({ progress: p }) =>
            setActiveProduct(indexFrom(p, products.length)),
        });
      }
    }, root);

    return () => context.revert();
  }, []);

  const product = products[activeProduct];
  const currentBanner = heroBanners[activeBanner];

  return (
    <div className="showroom" ref={root}>
      <SiteNav />
      <main className="showroom-stack">
        {/* LAYER 1: THREE AUTOMATIC FULL-SCREEN BANNERS (CLEAN, NO TEXT CLUTTER) */}
        <section
          className="hero-track"
          aria-label="NS Home Appliances showroom introduction"
        >
          <div className="hero-stage">
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

            <div className="hero-grain" aria-hidden="true" />

            <HeroDistortion
              activePalette={currentBanner.palette}
              isActive={isHeroInteractive}
            />

            <h1 id="hero-title" className="sr-only">
              NS Home Appliances — Digital Showroom
            </h1>
          </div>
        </section>

        {/* LAYER 2: SHOP BY CATEGORY INTRODUCTION COVER */}
        <section
          className="category-intro cover-panel"
          ref={categoryCover}
          aria-labelledby="category-intro-title"
        >
          <div className="intro-sticky">
            <div className="cover-editorial-body" ref={coverEditorialBody}>
              <h2
                id="category-intro-title"
                className="category-cover-title"
                ref={coverHeading}
              >
                <span
                  className="cover-title-interactive-unit"
                  ref={coverHeadingInteractive}
                >
                  <span className="cover-title-line">Shop by category</span>
                </span>
              </h2>
              <p className="cover-supporting-note" ref={coverTagline}>
                Everything your home needs. In one place.
              </p>
              <div className="cover-settle-line" ref={coverSettleLine} aria-hidden="true" />
            </div>
          </div>
        </section>
        <div className="layer-spacer" aria-hidden="true" />

        {/* LAYERS 3 to 6: INDIVIDUAL FULL-SCREEN CATEGORY PAGES (COOLING, LAUNDRY, KITCHEN, HOME) */}
        {categories.map((cat, idx) => (
          <Fragment key={cat.slug}>
            <section
              id={idx === 0 ? "categories" : `category-${cat.slug}`}
              className="category-sheet cover-panel"
              style={css({
                zIndex: 3 + idx,
                "--scene-base": cat.palette.base,
                "--scene-panel": cat.palette.panel,
                "--scene-ink": cat.palette.ink,
              })}
              aria-label={cat.name}
            >
              <div className="category-scene category-scene-inner">
                <div className="category-left">
                  <p className="scene-number">0{idx + 1} / 04</p>
                  <h2>{cat.name}</h2>
                  <p className="category-signal">Scroll-led selection</p>
                </div>
                <div className="category-cutout">
                  <Image
                    src={cat.image}
                    alt={`Temporary ${cat.name} appliance cutout`}
                    fill
                    sizes="(max-width: 760px) 85vw, 46vw"
                    style={{
                      objectFit: "contain",
                      transform: `translate(${cat.art.x}%, ${cat.art.y}%) scale(${cat.art.scale}) rotate(${cat.art.rotation ?? 0}deg)`,
                    }}
                  />
                </div>
                <div className="category-right">
                  <p className="eyebrow">Explore</p>
                  <ul>
                    {cat.subcategories.map((sub, sIdx) => (
                      <li key={sub.slug}>
                        <Link href={`/category/${cat.slug}/${sub.slug}`}>
                          <span>0{sIdx + 1}</span>
                          {sub.name}
                          <b>↗</b>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="temporary-note">Temporary cutout / final NS product image to replace</p>
                </div>
                <div className="scene-dots" aria-hidden>
                  {categories.map((_, dotIdx) => (
                    <i key={dotIdx} className={dotIdx === idx ? "active" : ""} />
                  ))}
                </div>
              </div>
            </section>
            <div className="layer-spacer" aria-hidden="true" />
          </Fragment>
        ))}

        {/* LAYER 7: PRODUCT SHOWCASE TRACK */}
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
            <div key={`visual-${product.slug}`} className="product-visual product-state-enter">
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
            <div key={`info-${product.slug}`} className="product-info product-state-enter">
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

        {/* LAYER 8: VISIT PANEL */}
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
