"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
} from "motion/react";
import { searchCatalog } from "@/data/catalog-search";

interface SiteNavProps {
  detail?: boolean;
}

export function SiteNav({ detail = false }: SiteNavProps) {
  const root = detail ? "/" : "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const prodRef = useRef<HTMLAnchorElement>(null);
  const catRef = useRef<HTMLAnchorElement>(null);
  const visRef = useRef<HTMLAnchorElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const startScroll = 15;
  const dockDistance = 120;

  // Single deterministic continuous scroll progress from 0 (at 15px) to 1 (at 120px)
  const scrollProgress = useTransform(
    scrollY,
    [startScroll, dockDistance],
    [0, 1],
    { clamp: true }
  );

  // Dynamic floating-to-formed deltas (measured on mount and resize, cached in MotionValues)
  const deltaProd = useMotionValue(0);
  const deltaCat = useMotionValue(0);
  const deltaVis = useMotionValue(0);
  const deltaSearch = useMotionValue(0);

  // Smooth compositor-driven transforms (1:1 with scroll, no React re-render, no layout reflow)
  const xProd = useTransform(
    [scrollProgress, deltaProd],
    ([p, d]: number[]) => (detail || shouldReduceMotion ? 0 : d * (1 - p))
  );
  const xCat = useTransform(
    [scrollProgress, deltaCat],
    ([p, d]: number[]) => (detail || shouldReduceMotion ? 0 : d * (1 - p))
  );
  const xVis = useTransform(
    [scrollProgress, deltaVis],
    ([p, d]: number[]) => (detail || shouldReduceMotion ? 0 : d * (1 - p))
  );
  const xSearch = useTransform(
    [scrollProgress, deltaSearch],
    ([p, d]: number[]) => (detail || shouldReduceMotion ? 0 : d * (1 - p))
  );

  // Translucent navbar shell: constant size, revealed cleanly via opacity and subtle scale
  const navShellOpacity = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail || shouldReduceMotion ? [1, 1] : [0, 1],
    { clamp: true }
  );
  const navShellScale = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail || shouldReduceMotion ? [1, 1] : [0.985, 1],
    { clamp: true }
  );

  // Centered brand timing: appears naturally via opacity and a subtle vertical translate
  const brandOpacity = useTransform(
    scrollY,
    [startScroll + 25, dockDistance],
    detail || shouldReduceMotion ? [1, 1] : [0, 1],
    { clamp: true }
  );
  const brandY = useTransform(
    scrollY,
    [startScroll + 25, dockDistance],
    detail || shouldReduceMotion ? [0, 0] : [6, 0],
    { clamp: true }
  );

  // Text color transition from white over dark hero banner to deep charcoal in formed navbar
  const navTextColor = useTransform(
    scrollY,
    [startScroll + 10, dockDistance - 15],
    detail ? ["#ffffff", "#ffffff"] : ["#ffffff", "#0e1618"],
    { clamp: true }
  );

  // Enable brand link interactivity only when visible (does not re-render during intermediate scrolling)
  const [brandInteractive, setBrandInteractive] = useState(detail);
  useMotionValueEvent(brandOpacity, "change", (latest) => {
    if (detail) return;
    const isInteractive = latest > 0.5;
    setBrandInteractive((prev) => (prev !== isInteractive ? isInteractive : prev));
  });

  // Calculate target floating offsets relative to the formed navbar layout
  useEffect(() => {
    if (detail || typeof window === "undefined") return;

    const updateDeltas = () => {
      const vw = window.innerWidth;
      // On mobile screens (<= 760px), mobile menu and search stay compact within the pill
      if (vw <= 760) {
        deltaProd.set(0);
        deltaCat.set(0);
        deltaVis.set(0);
        deltaSearch.set(0);
        return;
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

      deltaProd.set(floatProdLeft - formedProdLeft);
      deltaCat.set(floatCatLeft - formedCatLeft);
      deltaVis.set(floatVisLeft - formedVisLeft);
      deltaSearch.set(floatSearchRight - formedSearchRight);
    };

    updateDeltas();

    let rAF = 0;
    const onResize = () => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(updateDeltas);
    };
    window.addEventListener("resize", onResize, { passive: true });

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateDeltas).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(rAF);
      window.removeEventListener("resize", onResize);
    };
  }, [detail, deltaProd, deltaCat, deltaVis, deltaSearch]);

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

  // Handle ESC key to close search or mobile menu.
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

  return (
    <>
      <header
        className={`site-nav ${detail ? "site-nav-detail" : "site-nav-home"}`}
        aria-label="Primary navigation"
      >
        {/* 1. SEPARATE TRANSLUCENT GLASS SHELL (Constant dimensions, revealed cleanly via opacity and subtle scale) */}
        <motion.div
          className="site-nav-shell"
          style={
            detail || shouldReduceMotion
              ? undefined
              : { opacity: navShellOpacity, scale: navShellScale }
          }
          aria-hidden
        />

        {/* 2. CRISP CONTENT LAYER (Vector text, zero blur, subpixel sharp, borderless) */}
        <motion.div
          className="site-nav-content"
          style={
            detail || shouldReduceMotion
              ? undefined
              : { color: navTextColor }
          }
        >
          {/* ZONE 1: LEFT GROUP */}
          <div className="site-nav-left">
            <nav className="site-nav-links" aria-label="Section links">
              <motion.a
                ref={prodRef}
                href={`${root}#products`}
                className="nav-text-link"
                style={{ x: xProd }}
              >
                Products
              </motion.a>
              <motion.a
                ref={catRef}
                href={`${root}#categories`}
                className="nav-text-link"
                style={{ x: xCat }}
              >
                Categories
              </motion.a>
              <motion.a
                ref={visRef}
                href={`${root}#visit`}
                className="nav-text-link"
                style={{ x: xVis }}
              >
                Visit
              </motion.a>
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
            <motion.div
              className="site-nav-brand-wrap"
              style={{
                opacity: detail || shouldReduceMotion ? 1 : brandOpacity,
                y: detail || shouldReduceMotion ? 0 : brandY,
                pointerEvents: brandInteractive ? "auto" : "none",
              }}
            >
              <Link
                href={detail ? "/" : "#hero-title"}
                className="site-nav-brand"
                aria-label="NS Home Appliances home"
                tabIndex={brandInteractive ? 0 : -1}
                onClick={(e) => {
                  if (!detail) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                NS Home Appliances
              </Link>
            </motion.div>
          </div>

          {/* ZONE 3: RIGHT GROUP */}
          <div className="site-nav-right">
            <motion.button
              type="button"
              className="nav-text-link nav-search-btn"
              ref={searchTriggerRef}
              aria-label="Search showroom collection"
              onClick={openSearch}
              style={{ x: xSearch }}
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
            </motion.button>
          </div>
        </motion.div>

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
              transition={{ duration: shouldReduceMotion ? 0.001 : 0.2 }}
            >
              <a
                href={`${root}#products`}
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
            transition={{ duration: shouldReduceMotion ? 0.001 : 0.2 }}
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
                duration: shouldReduceMotion ? 0.001 : 0.24,
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

              {/* SEARCH RESULTS (Displayed directly below input when user types) */}
              {cleanQuery && (
                <div className="nav-search-results">
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
