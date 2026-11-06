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
import { StorefrontPanorama } from "./storefront-panorama";
import { HeroDistortion } from "@/components/hero-distortion";
import type { AnnouncementBar } from "@/lib/announcement-bar";
import { AnnouncementBarView } from "@/components/announcement-bar";
import type { HomepageBanner } from "@/lib/homepage-banners";
import { SHOWROOM_LOCATION } from "@/lib/showroom-location";

gsap.registerPlugin(ScrollTrigger);

if (typeof window !== "undefined") {
  // Prevent mobile address bar show/hide from triggering expensive recalculations during touch scroll
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

// Exterior showroom photography configuration
const STOREFRONT_IMAGE_PATH = "/images/storefront.jpg";

const BANNER_DURATION = 5500; // 5.5s automatic continuous rotation

export function HomeExperience({ banners, announcement }: { banners: HomepageBanner[]; announcement: AnnouncementBar }) {
  const root = useRef<HTMLDivElement>(null);
  const categoryCover = useRef<HTMLElement>(null);
  const coverEditorialBody = useRef<HTMLDivElement>(null);
  const coverHeading = useRef<HTMLHeadingElement>(null);
  const coverHeadingInteractive = useRef<HTMLSpanElement>(null);
  const coverTagline = useRef<HTMLParagraphElement>(null);
  const coverSettleLine = useRef<HTMLDivElement>(null);
  const categoryTrack = useRef<HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const category = categories[activeCategory];
  const visitTrack = useRef<HTMLElement>(null);
  const visitForeground = useRef<HTMLDivElement>(null);
  const visitHeading = useRef<HTMLHeadingElement>(null);
  const visitTagline = useRef<HTMLParagraphElement>(null);
  const visitSettleLine = useRef<HTMLDivElement>(null);
  const visitCta = useRef<HTMLAnchorElement>(null);
  const siteFooterRef = useRef<HTMLElement>(null);
  const [isHeroInteractive, setIsHeroInteractive] = useState(true);
  const shouldReduceMotion = useReducedMotion();


  // Exactly 3 automatic rotating banners
  const [activeBanner, setActiveBanner] = useState(0);

  // Automatic continuous loop: Banner 1 -> Banner 2 -> Banner 3 -> Banner 1
  useEffect(() => {
    if (shouldReduceMotion) return;

    const timer = setInterval(() => {
      setActiveBanner((curr) => (curr + 1) % banners.length);
    }, BANNER_DURATION);

    return () => clearInterval(timer);
  }, [banners.length, shouldReduceMotion]);

  // Ensure homepage begins at the top (Hero) on initial mount, refresh, and back/forward unless an explicit section hash is requested
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    ScrollTrigger.clearScrollMemory();

    const hash = window.location.hash;
    const hasSectionHash = hash === "#categories" || hash === "#visit";

    if (!hasSectionHash) {
      window.scrollTo(0, 0);
    }
  }, []);

  // Handle browser Back/Forward (popstate) and back-forward cache restoration (pageshow)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const hash = window.location.hash;
      const hasSectionHash = hash === "#categories" || hash === "#visit";
      if (!hasSectionHash) {
        window.scrollTo(0, 0);
      }
    };

    const handlePageShow = () => {
      const hash = window.location.hash;
      const hasSectionHash = hash === "#categories" || hash === "#visit";
      if (!hasSectionHash) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

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

    const mm = gsap.matchMedia(root);

    // Initial seam prevention at scroll position 0
    if (categoryCover.current && window.scrollY <= 5) {
      categoryCover.current.style.visibility = "hidden";
    }

    const indexFrom = (progress: number, size: number) =>
      Math.min(size - 1, Math.floor(progress * size + 0.0001));

    // Shared category switch trigger across all screen sizes
    if (categoryTrack.current) {
      ScrollTrigger.create({
        trigger: categoryTrack.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: ({ progress }) => {
          const next = indexFrom(progress, categories.length);
          setActiveCategory((previous) => (previous === next ? previous : next));
        },
      });
    }

    // DESKTOP: (min-width: 1025px) -> EXACT APPROVED DESKTOP TIMELINE & INTERACTION (100% UNCHANGED)
    mm.add("(min-width: 1025px)", () => {
      if (categoryCover.current) {
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
            scrub: 0.12,
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

      if (visitTrack.current && visitHeading.current && visitTagline.current && visitSettleLine.current) {
        const visitTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: visitTrack.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // Foreground text exits on scroll, moving up slightly (~24px) and fading out
        visitTimeline
          .to(visitHeading.current, { autoAlpha: 0, y: -24, duration: 0.5, ease: "power2.inOut" }, 0.04)
          .to(visitTagline.current, { autoAlpha: 0, y: -18, duration: 0.45, ease: "power2.inOut" }, 0.06)
          .to(visitSettleLine.current, { autoAlpha: 0, scaleX: 0.2, duration: 0.35, ease: "power2.inOut" }, 0.08);

        if (visitCta.current) {
          visitTimeline.to(visitCta.current, { autoAlpha: 0, y: -16, duration: 0.4, ease: "power2.inOut" }, 0.08);
        }

        if (visitForeground.current) {
          visitTimeline.to(visitForeground.current, { pointerEvents: "none" }, 0.45);
        }
      }
    });

    // MOBILE & TABLET: (max-width: 1024px) -> FLUID TOUCH SCROLL, ZERO RE-RENDER CHURN
    mm.add("(max-width: 1024px)", () => {
      if (categoryCover.current) {
        let lastCoverVisible: boolean | null = null;

        const coverTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: categoryCover.current,
            start: "top bottom",
            end: "top top",
            scrub: 0.08,
            invalidateOnRefresh: true,
            onUpdate: ({ progress }) => {
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

        if (coverHeading.current) {
          coverTimeline.fromTo(
            coverHeading.current,
            { autoAlpha: 0.3, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
            0.10
          );
        }

        if (coverTagline.current) {
          coverTimeline.fromTo(
            coverTagline.current,
            { autoAlpha: 0.2, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
            0.18
          );
        }

        if (coverSettleLine.current) {
          coverTimeline.fromTo(
            coverSettleLine.current,
            { autoAlpha: 0, scaleX: 0.25 },
            { autoAlpha: 1, scaleX: 1, duration: 0.35, ease: "power2.out" },
            0.28
          );
        }
      }

      if (visitTrack.current && visitHeading.current && visitTagline.current && visitSettleLine.current) {
        const visitTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: visitTrack.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // On mobile, text remains legible and exits smoothly as the footer arrives (~0.35-0.70 progress)
        // instead of vanishing abruptly on the first touch gesture (0.04 progress)
        visitTimeline
          .to(visitHeading.current, { autoAlpha: 0, y: -20, duration: 0.4, ease: "power2.inOut" }, 0.38)
          .to(visitTagline.current, { autoAlpha: 0, y: -14, duration: 0.35, ease: "power2.inOut" }, 0.42)
          .to(visitSettleLine.current, { autoAlpha: 0, scaleX: 0.2, duration: 0.3, ease: "power2.inOut" }, 0.46);

        if (visitCta.current) {
          visitTimeline.to(visitCta.current, { autoAlpha: 0, y: -12, duration: 0.35, ease: "power2.inOut" }, 0.46);
        }

        if (visitForeground.current) {
          visitTimeline.to(visitForeground.current, { pointerEvents: "none" }, 0.70);
        }
      }
    });

    return () => mm.revert();
  }, []);

  const currentBanner = banners[activeBanner] ?? banners[0]!;
  const hasCustomArtwork = Boolean(currentBanner?.imageUrl || currentBanner?.mobileImageUrl);

  return (
    <div className="showroom" ref={root}>
      <SiteNav />
      <main className="showroom-stack">
        {/* LAYER 1: THREE AUTOMATIC FULL-SCREEN BANNERS (CLEAN, NO TEXT CLUTTER) */}
        <section
          className="hero-track"
          aria-label="NS Home Appliances showroom introduction"
        >
          <div className={`hero-stage ${hasCustomArtwork ? "has-custom-artwork" : ""}`}>
            <div className="hero-banners" aria-hidden="true">
              {banners.map((banner, index) => {
                const isActive = activeBanner === index;
                const hasArtwork = Boolean(banner.imageUrl || banner.mobileImageUrl);
                return (
                  <div
                    key={banner.id}
                    className={`hero-ambient hero-banner-layer ${banner.className} ${isActive ? "is-active" : ""} ${hasArtwork ? "has-artwork" : ""}`}
                    style={{
                      opacity: isActive ? 1 : 0,
                      zIndex: isActive ? 2 : 1,
                      transition: shouldReduceMotion
                        ? "none"
                        : "opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {hasArtwork ? (
                        <>
                          {/* The blurred copy fills any viewport/artwork ratio gap without cropping the artwork itself. */}
                          <picture className="hero-banner-backdrop">
                            {banner.imageUrl ? (
                              <source media="(min-width: 768px)" srcSet={banner.imageUrl} />
                            ) : null}
                            {banner.mobileImageUrl ? (
                              <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />
                            ) : null}
                            <img
                              src={banner.imageUrl || banner.mobileImageUrl || ""}
                              alt=""
                              aria-hidden="true"
                              loading={index === 0 ? "eager" : "lazy"}
                              decoding="async"
                            />
                          </picture>
                          <picture className="hero-banner-picture">
                            {banner.imageUrl ? (
                              <source media="(min-width: 768px)" srcSet={banner.imageUrl} />
                            ) : null}
                            {banner.mobileImageUrl ? (
                              <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />
                            ) : null}
                            <img
                              className="hero-banner-artwork"
                              src={banner.imageUrl || banner.mobileImageUrl || ""}
                              alt=""
                              loading={index === 0 ? "eager" : "lazy"}
                              decoding={index === 0 ? "sync" : "async"}
                            />
                          </picture>
                        </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="hero-grain" aria-hidden="true" />

            <HeroDistortion
              activePalette={currentBanner.palette}
              isActive={isHeroInteractive && !hasCustomArtwork}
            />

            <h1 id="hero-title" className="sr-only">
              NS Home Appliances — Digital Showroom
            </h1>
          </div>
        </section>

        <AnnouncementBarView
          enabled={announcement.enabled}
          messages={announcement.messages}
          theme={announcement.theme}
          separator={announcement.separator}
          speed={announcement.speed}
        />

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
          {/* Preload all category images to ensure instantaneous decoding and zero layout flash */}
          <div className="sr-only" aria-hidden="true">
            {categories.map((cat) => (
              <Image
                key={`preload-${cat.slug}`}
                src={cat.image}
                alt=""
                width={600}
                height={600}
                priority
              />
            ))}
          </div>

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
                <h2>{category.name}</h2>
              </div>
            </div>
            <div className="category-cutout">
              <div key={`cat-cutout-${category.slug}`} className="category-cutout-stage category-state-enter">
                <Image
                  src={category.image}
                  alt={`${category.name} appliances`}
                  fill
                  sizes="(max-width: 760px) 78vw, (max-width: 1024px) 38vw, 34vw"
                  priority
                  style={css({
                    objectFit: "contain",
                    "--cat-scale": category.art.scale,
                    "--cat-x": `${category.art.x}%`,
                    "--cat-y": `${category.art.y}%`,
                    "--cat-rot": `${category.art.rotation ?? 0}deg`,
                    "--cat-mobile-scale": category.art.mobileScale ?? category.art.scale,
                    "--cat-mobile-y": `${category.art.mobileY ?? category.art.y}%`,
                  })}
                  className="cat-product-img"
                />
              </div>
            </div>
            <div className="category-right">
              <div key={`cat-right-${category.slug}`} className="category-state-enter">
                <ul>
                  {category.subcategories.map((sub) => (
                    <li key={sub.slug}>
                      <Link href={`/category/${category.slug}/${sub.slug}`}>
                        <span>{sub.name}</span>
                        <b>↗</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pagination dots */}
            <div className="scene-dots" aria-label="Category navigation">
              {categories.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  className={dotIdx === activeCategory ? "active" : ""}
                  type="button"
                  aria-current={dotIdx === activeCategory ? "true" : undefined}
                  aria-label={`Category ${dotIdx + 1}`}
                  onClick={() => {
                    const track = categoryTrack.current;
                    if (!track) return;
                    const categoryStride = track.offsetHeight / categories.length;
                    window.scrollTo({
                      top: track.offsetTop + categoryStride * dotIdx,
                      behavior: "smooth",
                    });
                  }}
                />
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
        >
          <div className="visit-stage">
            {/* Atmospheric Background Layer with Mathematical Storefront Panorama */}
            <div className="visit-bg" aria-hidden="true">
              <StorefrontPanorama
                src={STOREFRONT_IMAGE_PATH}
                alt="NS Home Appliances Showroom Exterior"
              />
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
                  <span className="visit-title-line">Visit our showroom</span>
                </h2>
                <p className="visit-supporting-note" ref={visitTagline}>
                  Explore our appliances in person. Find us on Google Maps and plan your visit.
                </p>
                <div className="visit-settle-line" ref={visitSettleLine} aria-hidden="true" />
                <a
                  ref={visitCta}
                  href={SHOWROOM_LOCATION.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="visit-directions-btn"
                  id="visit-get-directions"
                  aria-label="Get directions to NS Home Appliances on Google Maps"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="visit-pin-icon"
                  >
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Get Directions</span>
                  <span className="visit-directions-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* COMPACT FROSTED-GLASS FOOTER — Enters naturally as next section in normal document flow */}
          <SiteFooter
            ref={siteFooterRef}
            variant="glass-overlay"
            onCategoryClick={(index) => {
              const track = categoryTrack.current;
              if (!track) return;
              const categoryStride = track.offsetHeight / categories.length;
              window.scrollTo({
                top: track.offsetTop + categoryStride * index,
                behavior: "smooth",
              });
            }}
            onSectionClick={(id) => {
              const target = document.getElementById(id);
              if (target) {
                target.scrollIntoView({ behavior: "smooth" });
              }
            }}
          />
        </section>
      </main>
    </div>
  );
}
