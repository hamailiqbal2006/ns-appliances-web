"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories } from "@/data/catalog";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { HeroDistortion } from "@/components/hero-distortion";

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

// Robust hysteresis-buffered category calculation to prevent flickering at transition thresholds
function computeCategoryIndex(
  progress: number,
  currentIndex: number,
  count: number
): number {
  if (progress <= 0.01) return 0;
  if (progress >= 0.99) return count - 1;

  const bandSize = 1 / count;
  const hysteresis = bandSize * 0.10; // 10% deadband margin

  // Forward transition with hysteresis threshold
  for (let i = currentIndex; i < count - 1; i++) {
    const forwardThreshold = (i + 1) * bandSize + hysteresis;
    if (progress >= forwardThreshold) {
      currentIndex = i + 1;
    } else {
      break;
    }
  }

  // Backward transition with hysteresis threshold
  for (let i = currentIndex; i > 0; i--) {
    const backwardThreshold = i * bandSize - hysteresis;
    if (progress <= backwardThreshold) {
      currentIndex = i - 1;
    } else {
      break;
    }
  }

  return Math.min(count - 1, Math.max(0, currentIndex));
}

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
  const siteFooterRef = useRef<HTMLElement>(null);
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

        let lastCoverVisible: boolean | null = null;

        const coverTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: categoryCover.current,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: ({ progress }) => {
              setHeroCovered(progress > 0.85);
              const isVisible = progress > 0;
              if (lastCoverVisible !== isVisible) {
                lastCoverVisible = isVisible;
                if (categoryCover.current) {
                  categoryCover.current.style.visibility = isVisible ? "visible" : "hidden";
                }
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

      let currentCategoryIdx = 0;

      if (categoryTrack.current) {
        ScrollTrigger.create({
          trigger: categoryTrack.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: ({ progress: p }) => {
            const next = computeCategoryIndex(p, currentCategoryIdx, categories.length);
            if (next !== currentCategoryIdx) {
              currentCategoryIdx = next;
              setActiveCategory(next);
            }
          },
        });
      }

      if (siteFooterRef.current) {
        gsap.set(siteFooterRef.current, { yPercent: 100 });
      }

      if (visitTrack.current && visitHeading.current && visitTagline.current && visitSettleLine.current) {
        let lastFooterPointerEvents: boolean | null = null;

        const visitTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: visitTrack.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const allowEvents = self.progress >= 0.88;
              if (lastFooterPointerEvents !== allowEvents) {
                lastFooterPointerEvents = allowEvents;
                if (siteFooterRef.current) {
                  siteFooterRef.current.style.pointerEvents = allowEvents ? "auto" : "none";
                }
              }
            },
          },
        });

        // STATE B: Only foreground text disappears smoothly, moving up slightly (~24px) and fading out
        // Foreground text exits in the first portion (0.04 - 0.28), followed by an intentional background hold
        visitTimeline
          .to(visitHeading.current, { autoAlpha: 0, y: -24, duration: 0.24, ease: "power2.inOut" }, 0.04)
          .to(visitTagline.current, { autoAlpha: 0, y: -18, duration: 0.22, ease: "power2.inOut" }, 0.06)
          .to(visitSettleLine.current, { autoAlpha: 0, scaleX: 0.2, duration: 0.18, ease: "power2.inOut" }, 0.08);

        if (visitForeground.current) {
          visitTimeline.to(visitForeground.current, { pointerEvents: "none" }, 0.28);
        }

        // STATE C: Frosted glass footer smoothly rises from bottom OVER the stationary background (0.50 - 1.00)
        // Between 0.28 and 0.50, the background alone is held stationary for clear visual appreciation
        if (siteFooterRef.current) {
          visitTimeline.fromTo(
            siteFooterRef.current,
            { yPercent: 100 },
            { yPercent: 0, duration: 0.50, ease: "power1.out" },
            0.50
          );
        }
      }
    }, root);

    return () => context.revert();
  }, []);

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
          style={{ height: `${categories.length * 80}svh` }}
        >
          <div className="category-scene">
            {/* Split Background Layers per Category (GPU-accelerated opacity crossfade, zero gradient repaint) */}
            {categories.map((cat, idx) => (
              <div
                key={`bg-${cat.slug}`}
                className={`category-scene-bg ${idx === activeCategory ? "is-active" : ""}`}
                style={css({
                  "--cat-base": cat.palette.base,
                  "--cat-panel": cat.palette.panel,
                })}
              />
            ))}

            {/* Pre-rendered Category Content Layers (Pre-decoded images, zero DOM unmounting, 60fps GPU transform/opacity) */}
            {categories.map((cat, idx) => {
              const isActive = idx === activeCategory;
              return (
                <div
                  key={`content-${cat.slug}`}
                  className={`category-content-layer ${isActive ? "is-active" : ""}`}
                  style={css({
                    "--scene-ink": cat.palette.ink,
                  })}
                  aria-hidden={!isActive}
                >
                  <div className="category-left">
                    <p className="scene-number">0{idx + 1} / 04</p>
                    <h2>{cat.name}</h2>
                    <p className="category-signal">Scroll-led selection</p>
                  </div>
                  <div className="category-cutout">
                    <div className="category-cutout-stage">
                      <Image
                        src={cat.image}
                        alt={`Temporary ${cat.name} appliance cutout`}
                        fill
                        sizes="(max-width: 760px) 85vw, 46vw"
                        priority
                        style={{
                          objectFit: "contain",
                          transform: `translate(${cat.art.x}%, ${cat.art.y}%) scale(${cat.art.scale}) rotate(${cat.art.rotation ?? 0}deg)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="category-right">
                    <p className="eyebrow">Explore</p>
                    <ul>
                      {cat.subcategories.map((sub, sIdx) => (
                        <li key={sub.slug}>
                          <Link href={`/category/${cat.slug}/${sub.slug}`} tabIndex={isActive ? 0 : -1}>
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
              );
            })}

            {/* Pagination dots */}
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
          style={{ height: "260svh" }}
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

            {/* LAYER 5: FULL-SCREEN TRANSLUCENT FROSTED-GLASS FOOTER */}
            <SiteFooter
              ref={siteFooterRef}
              variant="glass-overlay"
              onCategoryClick={(index) => {
                if (categoryTrack.current) {
                  const trackTop = categoryTrack.current.offsetTop;
                  const trackHeight = categoryTrack.current.offsetHeight;
                  const targetY = trackTop + (index / categories.length) * trackHeight + 10;
                  const lenis = (window as unknown as { __lenis?: { scrollTo: (target: number, opts?: unknown) => void } }).__lenis;
                  if (lenis) {
                    lenis.scrollTo(targetY, { duration: 0.9 });
                  } else {
                    window.scrollTo({
                      top: targetY,
                      behavior: "smooth",
                    });
                  }
                }
              }}
              onSectionClick={(id) => {
                const target = document.getElementById(id);
                if (target) {
                  const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement, opts?: unknown) => void } }).__lenis;
                  if (lenis) {
                    lenis.scrollTo(target, { duration: 0.9 });
                  } else {
                    target.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
