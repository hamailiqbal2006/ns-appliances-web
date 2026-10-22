"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories } from "@/data/catalog";
import { SiteNav } from "@/components/site-nav";
import { HeroDistortion } from "@/components/hero-distortion";

const emptySubscribe = () => () => {};

gsap.registerPlugin(ScrollTrigger);

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

// Exterior showroom photography configuration
// Set to true when the physical storefront photograph is placed at /public/images/storefront.jpg
const HAS_STOREFRONT_IMAGE = false;
const STOREFRONT_IMAGE_PATH = "/images/storefront.jpg";

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
  const categoryTrack = useRef<HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const visitTrack = useRef<HTMLElement>(null);
  const visitForeground = useRef<HTMLDivElement>(null);
  const visitHeading = useRef<HTMLHeadingElement>(null);
  const visitTagline = useRef<HTMLParagraphElement>(null);
  const visitSettleLine = useRef<HTMLDivElement>(null);
  const [isHeroInteractive, setIsHeroInteractive] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const currentYear = useSyncExternalStore(
    emptySubscribe,
    () => new Date().getFullYear(),
    () => 2026
  );

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
      if (id !== "categories" && id !== "visit") return;

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

      if (categoryTrack.current) {
        ScrollTrigger.create({
          trigger: categoryTrack.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: ({ progress: p }) => {
            const next = indexFrom(p, categories.length);
            setActiveCategory((prev) => (prev !== next ? next : prev));
          },
        });
      }

      if (visitTrack.current && visitHeading.current && visitTagline.current && visitSettleLine.current) {
        const visitTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: visitTrack.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.12,
            invalidateOnRefresh: true,
          },
        });

        // STATE B: Only foreground text disappears smoothly, moving up slightly (~20px) and fading out
        // Foreground text exits in the first portion of scroll, then holds empty background
        visitTimeline
          .to(visitHeading.current, { autoAlpha: 0, y: -24, duration: 0.38, ease: "power2.inOut" }, 0.04)
          .to(visitTagline.current, { autoAlpha: 0, y: -18, duration: 0.36, ease: "power2.inOut" }, 0.08)
          .to(visitSettleLine.current, { autoAlpha: 0, scaleX: 0.2, duration: 0.30, ease: "power2.inOut" }, 0.11);

        if (visitForeground.current) {
          visitTimeline.to(visitForeground.current, { pointerEvents: "none" }, 0.42);
        }
      }
    }, root);

    return () => context.revert();
  }, []);

  const category = categories[activeCategory];
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

        {/* LAYER 3: STATIONARY CATEGORY SHOWCASE */}
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
              <div key={`cat-left-${category.slug}`} className="category-state-enter">
                <p className="scene-number">0{activeCategory + 1} / 04</p>
                <h2>{category.name}</h2>
                <p className="category-signal">Scroll-led selection</p>
              </div>
            </div>
            <div className="category-cutout">
              <div key={`cat-cutout-${category.slug}`} className="category-cutout-stage category-state-enter">
                <Image
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
            </div>
            <div className="category-right">
              <div key={`cat-right-${category.slug}`} className="category-state-enter">
                <p className="eyebrow">Explore</p>
                <ul>
                  {category.subcategories.map((sub, sIdx) => (
                    <li key={sub.slug}>
                      <Link href={`/category/${category.slug}/${sub.slug}`}>
                        <span>0{sIdx + 1}</span>
                        {sub.name}
                        <b>↗</b>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="temporary-note">Temporary cutout / final NS product image to replace</p>
              </div>
            </div>
            <div className="scene-dots" aria-hidden>
              {categories.map((_, dotIdx) => (
                <i key={dotIdx} className={dotIdx === activeCategory ? "active" : ""} />
              ))}
            </div>
          </div>
        </section>

        {/* LAYER 4: VISIT OUR STORE CINEMATIC STAGE */}
        <section
          id="visit"
          className="visit-track cover-panel"
          ref={visitTrack}
          aria-labelledby="visit-cover-title"
          style={{ height: "230svh" }}
        >
          <div className="visit-stage">
            {/* Atmospheric Background Layer — Stationary throughout entire track */}
            <div className="visit-bg" aria-hidden="true">
              {HAS_STOREFRONT_IMAGE ? (
                <Image
                  src={STOREFRONT_IMAGE_PATH}
                  alt="NS Home Appliances Storefront Exterior"
                  fill
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                  priority={false}
                />
              ) : (
                <div className="visit-atmospheric-viewport">
                  <div className="visit-ambient-base" />
                  <div className="visit-ambient-glow" />
                  <div className="visit-ambient-horizon" />
                  <div className="visit-grain" />
                </div>
              )}
              <div className="visit-scrim" />
            </div>

            {/* Foreground Content Layer — Exits on scroll while background stays stationary */}
            <div className="visit-foreground" ref={visitForeground}>
              <div className="visit-editorial-body">
                <h2
                  id="visit-cover-title"
                  className="visit-cover-title"
                  ref={visitHeading}
                >
                  <span className="visit-title-line">Visit our store</span>
                </h2>
                <p className="visit-supporting-note" ref={visitTagline}>
                  Experience the appliances in person. Find what fits your home.
                </p>
                <div className="visit-settle-line" ref={visitSettleLine} aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* LAYER 5: FULL-SCREEN CINEMATIC FOOTER */}
        <footer className="site-footer cover-panel" role="contentinfo">
          <div className="footer-full-container">
            {/* Upper Region: Final Brand Statement */}
            <div className="footer-hero-brand-wrap">
              <span className="footer-hero-label">Comfort made better.</span>
              <h2 className="footer-hero-title">NS Home Appliances</h2>
            </div>

            {/* Middle Region: Editorial Navigation */}
            <nav className="footer-full-nav" aria-label="Footer navigation">
              <ul className="footer-full-links">
                <li>
                  <Link href="/" className="footer-full-link">
                    <span>01</span>
                    <b>Home</b>
                    <i>↗</i>
                  </Link>
                </li>
                <li>
                  <a href="#categories" className="footer-full-link">
                    <span>02</span>
                    <b>Categories</b>
                    <i>↗</i>
                  </a>
                </li>
                <li>
                  <a href="#categories" className="footer-full-link">
                    <span>03</span>
                    <b>Products</b>
                    <i>↗</i>
                  </a>
                </li>
                <li>
                  <a href="#visit" className="footer-full-link">
                    <span>04</span>
                    <b>Visit Our Store</b>
                    <i>↗</i>
                  </a>
                </li>
              </ul>
            </nav>

            {/* Bottom Region: Dynamic Copyright & Back to Top */}
            <div className="footer-full-bottom">
              <p className="footer-full-copyright">
                &copy; {currentYear} NS Home Appliances. All rights reserved.
              </p>
              <a href="#hero-title" className="footer-full-back-top">
                Back to top <span>↑</span>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
