"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { searchCatalog } from "@/data/catalog-search";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface SiteNavProps {
  detail?: boolean;
}

export function SiteNav({ detail = false }: SiteNavProps) {
  const root = detail ? "/" : "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const headerRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prodRef = useRef<HTMLAnchorElement>(null);
  const catRef = useRef<HTMLAnchorElement>(null);
  const visRef = useRef<HTMLAnchorElement>(null);
  const brandWrapRef = useRef<HTMLDivElement>(null);
  const brandLinkRef = useRef<HTMLAnchorElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    window.setTimeout(() => searchTriggerRef.current?.focus(), 0);
  };

  const openSearch = () => {
    setSearchOpen(true);
    setMobileMenuOpen(false);
  };

  // Close mobile menu when user scrolls
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleScroll = () => setMobileMenuOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen]);

  // Handle ESC key to close search or mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSearch();
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  const searchResults = useMemo(() => searchCatalog(searchQuery), [searchQuery]);
  const cleanQuery = searchQuery.trim();

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((index) => (index + 1) % searchResults.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((index) => (index - 1 + searchResults.length) % searchResults.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const result = searchResults[activeResultIndex];
      if (result) window.location.assign(result.href);
    }
  };

  // Coordinated GSAP scroll transformation
  useIsomorphicLayoutEffect(() => {
    if (detail || typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      if (shellRef.current) gsap.set(shellRef.current, { opacity: 1, scaleX: 1, x: 0 });
      if (brandWrapRef.current) gsap.set(brandWrapRef.current, { autoAlpha: 1, y: 0, pointerEvents: "auto" });
      if (contentRef.current) gsap.set(contentRef.current, { color: "#0e1618" });
      return;
    }

    const calculateDeltas = () => {
      const vw = window.innerWidth;
      if (vw <= 760) {
        return {
          deltaProd: 0,
          deltaCat: 0,
          deltaVis: 0,
          deltaSearch: 0,
          initialScaleX: 1,
          initialTranslateX: 0,
        };
      }

      const isTablet = vw <= 1024;
      const targetLeftEdge = vw * (isTablet ? 0.055 : 0.065);
      const targetRightEdge = vw * (1 - (isTablet ? 0.07 : 0.075));
      const floatingGap = isTablet
        ? Math.min(55, Math.max(40, vw * 0.04))
        : Math.min(75, Math.max(55, vw * 0.044));

      const formedNavWidth = Math.min(1200, vw - 48);
      const formedNavLeft = (vw - formedNavWidth) / 2;
      const padding = Math.min(36, Math.max(24, vw * 0.026));
      const formedGap = Math.min(38, Math.max(32, vw * 0.024));

      const prodW = prodRef.current?.getBoundingClientRect().width || 74;
      const catW = catRef.current?.getBoundingClientRect().width || 85;

      const formedProdLeft = formedNavLeft + padding;
      const formedCatLeft = formedProdLeft + prodW + formedGap;
      const formedVisLeft = formedCatLeft + catW + formedGap;
      const formedSearchRight = formedNavLeft + formedNavWidth - padding;

      const floatProdLeft = targetLeftEdge;
      const floatCatLeft = floatProdLeft + prodW + floatingGap;
      const floatVisLeft = floatCatLeft + catW + floatingGap;
      const floatSearchRight = targetRightEdge;

      const deltaProd = floatProdLeft - formedProdLeft;
      const deltaCat = floatCatLeft - formedCatLeft;
      const deltaVis = floatVisLeft - formedVisLeft;
      const deltaSearch = floatSearchRight - formedSearchRight;

      // Sizing the glass shell so controls are ALWAYS strictly inside by 'padding'
      const initialLeft = floatProdLeft - padding;
      const initialRight = floatSearchRight + padding;
      const initialWidth = Math.max(formedNavWidth, initialRight - initialLeft);
      const initialCenter = (initialLeft + initialRight) / 2;
      const formedCenter = formedNavLeft + formedNavWidth / 2;

      const initialScaleX = initialWidth / formedNavWidth;
      const initialTranslateX = initialCenter - formedCenter;

      return {
        deltaProd,
        deltaCat,
        deltaVis,
        deltaSearch,
        initialScaleX,
        initialTranslateX,
      };
    };

    let timeline: gsap.core.Timeline | null = null;
    let st: ScrollTrigger | null = null;

    const buildTimeline = () => {
      if (timeline) {
        timeline.kill();
        timeline = null;
      }
      if (st) {
        st.kill();
        st = null;
      }

      const geom = calculateDeltas();

      // State A baseline initialization
      gsap.set(prodRef.current, { x: geom.deltaProd, y: 0, force3D: true });
      gsap.set(catRef.current, { x: geom.deltaCat, y: 0, force3D: true });
      gsap.set(visRef.current, { x: geom.deltaVis, y: 0, force3D: true });
      gsap.set(searchTriggerRef.current, { x: geom.deltaSearch, y: 0, force3D: true });
      gsap.set(shellRef.current, {
        opacity: 0,
        scaleX: geom.initialScaleX,
        x: geom.initialTranslateX,
        transformOrigin: "center center",
        force3D: true,
      });
      gsap.set(sweepRef.current, { xPercent: -100, opacity: 0, force3D: true });
      gsap.set(brandLinkRef.current, { autoAlpha: 0, y: 34, force3D: true });
      if (brandWrapRef.current) {
        brandWrapRef.current.style.pointerEvents = "none";
      }
      if (brandLinkRef.current) brandLinkRef.current.tabIndex = -1;
      gsap.set(contentRef.current, { color: "#ffffff" });

      let lastSettled = false;

      // Create unified scrubbed timeline: 0px -> 190px transformation distance
      // scrub: 0.12 eliminates discrete mouse-wheel stepping while feeling instantaneous
      timeline = gsap.timeline({
        defaults: { ease: "none", force3D: true },
        scrollTrigger: {
          id: "site-nav-transformation",
          start: 0,
          end: 190,
          scrub: 0.12,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const isSettled = self.progress >= 0.70;
            if (isSettled !== lastSettled) {
              lastSettled = isSettled;
              if (brandWrapRef.current) {
                brandWrapRef.current.style.pointerEvents = isSettled ? "auto" : "none";
              }
              if (brandLinkRef.current) {
                brandLinkRef.current.tabIndex = isSettled ? 0 : -1;
              }
            }
          },
        },
      });

      // PHASE 2 & 3: Coordinated Glide & Glass Capsule Contraction
      // Left controls glide inward with subtle natural stagger
      timeline.to(prodRef.current, { x: 0, duration: 0.85, ease: "power2.out" }, 0);
      timeline.to(catRef.current, { x: 0, duration: 0.88, ease: "power2.out" }, 0.02);
      timeline.to(visRef.current, { x: 0, duration: 0.90, ease: "power2.out" }, 0.04);
      timeline.to(searchTriggerRef.current, { x: 0, duration: 0.86, ease: "power2.out" }, 0.01);

      // Subtle vertical settling (1.2px) to enhance tactile glide without text blur
      timeline.to([prodRef.current, catRef.current, visRef.current, searchTriggerRef.current], {
        y: 1.2,
        duration: 0.40,
        ease: "sine.inOut",
      }, 0);
      timeline.to([prodRef.current, catRef.current, visRef.current, searchTriggerRef.current], {
        y: 0,
        duration: 0.45,
        ease: "sine.inOut",
      }, 0.40);

      // Glass capsule reveals around the moving controls (starts wide, contracts to formed navbar)
      timeline.to(shellRef.current, { opacity: 1, duration: 0.45, ease: "power1.inOut" }, 0.04);
      timeline.to(shellRef.current, { scaleX: 1, x: 0, duration: 0.88, ease: "power2.out" }, 0.02);

      // Specular highlight sweep across the glass surface
      timeline.fromTo(sweepRef.current,
        { xPercent: -100, opacity: 0 },
        { xPercent: 180, opacity: 0.48, duration: 0.52, ease: "power1.inOut" },
        0.44
      );
      timeline.to(sweepRef.current, { opacity: 0, duration: 0.16, ease: "power1.out" }, 0.82);

      // PHASE 3/4: Ink color transition as the light glass forms behind controls
      timeline.to(contentRef.current, { color: "#0e1618", duration: 0.38, ease: "power1.inOut" }, 0.14);

      // PHASE 4: Brand reveal (masked upward rise through overflow mask)
      timeline.fromTo(brandLinkRef.current,
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.46, ease: "power2.out" },
        0.44
      );

      st = timeline.scrollTrigger || null;
    };

    buildTimeline();

    // Rebuild on resize or font load
    let resizeTimer: number;
    const handleResize = () => {
      cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(buildTimeline);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    if (document.fonts?.ready) {
      document.fonts.ready.then(buildTimeline).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(resizeTimer);
      window.removeEventListener("resize", handleResize);
      if (timeline) timeline.kill();
      if (st) st.kill();
    };
  }, [detail]);

  return (
    <>
      <header
        ref={headerRef}
        className={`site-nav ${detail ? "site-nav-detail" : "site-nav-home"}`}
        aria-label="Primary navigation"
      >
        {/* Constant-geometry glass shell with geometry-synchronized scale and translate */}
        <div
          ref={shellRef}
          className="site-nav-shell"
          aria-hidden="true"
        >
          <span
            ref={sweepRef}
            className="site-nav-shell-sweep"
            aria-hidden="true"
          />
        </div>

        {/* Crisp vector content layer */}
        <div
          ref={contentRef}
          className="site-nav-content"
        >
          {/* ZONE 1: LEFT GROUP */}
          <div className="site-nav-left">
            <nav className="site-nav-links" aria-label="Section links">
              <a
                ref={prodRef}
                href={`${root}#categories`}
                className="nav-text-link"
              >
                Products
              </a>
              <a
                ref={catRef}
                href={`${root}#categories`}
                className="nav-text-link"
              >
                Categories
              </a>
              <a
                ref={visRef}
                href={`${root}#visit`}
                className="nav-text-link"
              >
                Visit
              </a>
            </nav>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="nav-text-link nav-mobile-btn"
              aria-label={
                mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="16" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
              <span className="nav-mobile-text">Menu</span>
            </button>
          </div>

          {/* ZONE 2: CENTER TITLE */}
          <div className="site-nav-center">
            <div
              ref={brandWrapRef}
              className="site-nav-brand-wrap"
            >
              <span className="site-nav-brand-mask">
                <Link
                  ref={brandLinkRef}
                  href={detail ? "/" : "#hero-title"}
                  className="site-nav-brand"
                  aria-label="NS Home Appliances home"
                  onClick={(e) => {
                    if (!detail) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  NS Home Appliances
                </Link>
              </span>
            </div>
          </div>

          {/* ZONE 3: RIGHT GROUP */}
          <div className="site-nav-right">
            <button
              type="button"
              className="nav-text-link nav-search-btn"
              ref={searchTriggerRef}
              aria-label="Search showroom collection"
              onClick={openSearch}
            >
              <svg
                className="nav-search-svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="nav-search-text">Search</span>
            </button>
          </div>
        </div>

        {/* MOBILE DROPDOWN PANEL */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              id="mobile-nav-panel"
              className="nav-mobile-dropdown"
              aria-label="Mobile navigation links"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <a
                href={`${root}#categories`}
                className="nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-link-num">01</span>
                <span className="mobile-link-text">Products</span>
                <span className="mobile-link-arrow">↓</span>
              </a>
              <a
                href={`${root}#categories`}
                className="nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-link-num">02</span>
                <span className="mobile-link-text">Categories</span>
                <span className="mobile-link-arrow">↓</span>
              </a>
              <a
                href={`${root}#visit`}
                className="nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-link-num">03</span>
                <span className="mobile-link-text">Visit</span>
                <span className="mobile-link-arrow">↓</span>
              </a>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* SEARCH MODAL OVERLAY */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="nav-search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSearch}
          >
            <motion.div
              className="nav-search-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Search NS digital showroom"
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="nav-search-input-wrap">
                <svg
                  className="nav-search-modal-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="search"
                  className="nav-search-input"
                  placeholder="Search appliances..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveResultIndex(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  aria-label="Search appliances"
                  aria-activedescendant={searchResults[activeResultIndex] ? `search-result-${searchResults[activeResultIndex].id}` : undefined}
                />
                <button
                  type="button"
                  className="nav-search-close-btn"
                  onClick={closeSearch}
                  aria-label="Close search dialog"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* SEARCH RESULTS */}
              {cleanQuery && (
                <div className="nav-search-results" data-lenis-prevent>
                  {searchResults.length > 0 ? (
                    <div className="nav-search-list" role="listbox" aria-label="Search results">
                      {searchResults.map((result, index) => (
                        <Link
                          key={result.id}
                          id={`search-result-${result.id}`}
                          href={result.href}
                          className={`nav-search-item ${index === activeResultIndex ? "is-active" : ""}`}
                          role="option"
                          aria-selected={index === activeResultIndex}
                          onMouseEnter={() => setActiveResultIndex(index)}
                          onClick={closeSearch}
                        >
                          <div className="nav-search-item-info">
                            <div className="nav-search-item-title">{result.title}</div>
                            <div className="nav-search-item-sub">{result.detail}</div>
                          </div>
                          <span className="nav-search-item-arrow" aria-hidden="true">
                            →
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="nav-search-empty">No matching products or categories</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

