"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "motion/react";
import { categories, products } from "@/data/catalog";

interface SiteNavProps {
  detail?: boolean;
  heroTitleDocked?: boolean;
}

const subscribeScroll = (callback: () => void) => {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
};

const getScrollSnapshot = () => window.scrollY > 20;
const getServerSnapshot = () => false;

export function SiteNav({ detail = false }: SiteNavProps) {
  const root = detail ? "/" : "";
  const isScrolled = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    getServerSnapshot
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Dynamic hero-to-nav geometry measurement
  const [geometry, setGeometry] = useState({
    deltaY: 278,
    heroScale: 3.5,
  });

  useEffect(() => {
    const calculateGeometry = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const isMobile = vw <= 760;

      const navTop = isMobile ? 12 : 18;
      const navHeight = isMobile ? 72 : 88;
      const navCenterY = navTop + navHeight / 2;

      // Hero optical center between nav and bottom cutouts
      const heroCenterY = vh * (isMobile ? 0.38 : 0.39);
      const dY = Math.max(0, heroCenterY - navCenterY);

      // Desired hero font size vs docked navbar font size
      const navFontSize = isMobile ? 15 : 20;
      const heroFontSize = isMobile
        ? Math.min(48, Math.max(32, vw * 0.086))
        : Math.min(76, Math.max(46, vw * 0.052));
      const hScale = heroFontSize / navFontSize;

      setGeometry({ deltaY: dY, heroScale: hScale });
    };

    calculateGeometry();
    window.addEventListener("resize", calculateGeometry, { passive: true });
    return () => window.removeEventListener("resize", calculateGeometry);
  }, []);

  const { scrollY } = useScroll();
  const dockDistance = 160;

  // Smoothstep easing for zero-velocity arrival and departure
  const easeSmooth = (t: number) => t * t * (3 - 2 * t);

  const titleY = useTransform(
    scrollY,
    [0, dockDistance],
    detail || shouldReduceMotion ? [0, 0] : [geometry.deltaY, 0],
    { ease: easeSmooth }
  );

  const titleScale = useTransform(
    scrollY,
    [0, dockDistance],
    detail || shouldReduceMotion ? [1, 1] : [geometry.heroScale, 1],
    { ease: easeSmooth }
  );

  const titleColor = useTransform(
    scrollY,
    [0, dockDistance],
    detail ? ["#ffffff", "#ffffff"] : ["#f8f7f0", "#142225"]
  );

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
        setSearchOpen(false);
        setSearchQuery("");
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

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openSearch = () => {
    setSearchOpen(true);
    setMobileMenuOpen(false);
  };

  // Search filtering
  const cleanQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = cleanQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.category.toLowerCase().includes(cleanQuery) ||
          p.kind.toLowerCase().includes(cleanQuery)
      )
    : [];

  const filteredCategories = cleanQuery
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.subcategories.some((s) => s.name.toLowerCase().includes(cleanQuery))
      )
    : [];

  return (
    <>
      <header
        className={`site-nav ${detail ? "site-nav-detail" : "site-nav-home"} ${isScrolled ? "is-scrolled" : "is-top"}`}
        aria-label="Primary navigation"
      >
        <div className="site-nav-grid">
          {/* ZONE 1: LEFT GROUP */}
          <div className="site-nav-left">
            <nav className="site-nav-desktop-links" aria-label="Section links">
              <a href={`${root}#categories`} className="nav-pill-btn">
                Categories
              </a>
              <a href={`${root}#products`} className="nav-pill-btn">
                Showroom
              </a>
              <a href={`${root}#visit`} className="nav-pill-btn">
                Visit
              </a>
            </nav>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="nav-pill-btn nav-mobile-menu-btn"
              aria-label={
                mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? (
                <svg
                  width="16"
                  height="16"
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
                  width="16"
                  height="16"
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
              <span className="nav-mobile-menu-text">Menu</span>
            </button>
          </div>

          {/* ZONE 2: CENTER TITLE (Continuous morph between hero and navbar) */}
          <div className="site-nav-center">
            <motion.div
              className="nav-brand-wrap"
              style={
                detail || shouldReduceMotion
                  ? undefined
                  : {
                      y: titleY,
                      scale: titleScale,
                      color: titleColor,
                      transformOrigin: "center center",
                    }
              }
            >
              <motion.div
                className="nav-brand-entrance"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.001 : 0.85,
                  delay: shouldReduceMotion ? 0 : 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={detail ? "/" : "#hero-title"}
                  className="nav-brand"
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
              </motion.div>
            </motion.div>
          </div>

          {/* ZONE 3: RIGHT GROUP */}
          <div className="site-nav-right">
            <button
              type="button"
              className="nav-pill-btn nav-search-btn"
              aria-label="Search showroom collection"
              onClick={openSearch}
            >
              <svg
                className="nav-search-svg"
                width="14"
                height="14"
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
              transition={{ duration: shouldReduceMotion ? 0.001 : 0.2 }}
            >
              <a
                href={`${root}#categories`}
                className="nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-link-num">01</span>
                <span className="mobile-link-text">Categories</span>
                <span className="mobile-link-arrow">↓</span>
              </a>
              <a
                href={`${root}#products`}
                className="nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-link-num">02</span>
                <span className="mobile-link-text">Showroom</span>
                <span className="mobile-link-arrow">↓</span>
              </a>
              <a
                href={`${root}#visit`}
                className="nav-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-link-num">03</span>
                <span className="mobile-link-text">Visit Store</span>
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
                  placeholder="Search appliances, categories, models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search query"
                />
                <button
                  type="button"
                  className="nav-search-close-btn"
                  onClick={closeSearch}
                  aria-label="Close search dialog"
                >
                  ESC
                </button>
              </div>

              {/* SEARCH RESULTS OR SUGGESTIONS */}
              <div className="nav-search-results">
                {cleanQuery ? (
                  <>
                    {filteredProducts.length === 0 &&
                    filteredCategories.length === 0 ? (
                      <p className="nav-search-empty">
                        No appliances found matching &ldquo;{searchQuery}&rdquo;.
                      </p>
                    ) : (
                      <>
                        {filteredProducts.length > 0 && (
                          <div className="nav-search-section">
                            <span className="nav-search-section-label">
                              Products
                            </span>
                            <div className="nav-search-list">
                              {filteredProducts.map((p) => (
                                <Link
                                  key={p.slug}
                                  href={`/products/${p.slug}`}
                                  className="nav-search-item"
                                  onClick={closeSearch}
                                >
                                  <div>
                                    <div className="nav-search-item-title">
                                      {p.name}
                                    </div>
                                    <div className="nav-search-item-sub">
                                      {p.category} · {p.kind}
                                    </div>
                                  </div>
                                  <span className="nav-search-item-action">
                                    View ↗
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredCategories.length > 0 && (
                          <div className="nav-search-section">
                            <span className="nav-search-section-label">
                              Categories
                            </span>
                            <div className="nav-search-list">
                              {filteredCategories.map((c) => (
                                <a
                                  key={c.slug}
                                  href={`${root}#categories`}
                                  className="nav-search-item"
                                  onClick={closeSearch}
                                >
                                  <div>
                                    <div className="nav-search-item-title">
                                      {c.name}
                                    </div>
                                    <div className="nav-search-item-sub">
                                      {c.subcategories
                                        .map((s) => s.name)
                                        .join(", ")}
                                    </div>
                                  </div>
                                  <span className="nav-search-item-action">
                                    Explore ↓
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="nav-search-quick">
                    <span className="nav-search-section-label">
                      Quick Explore
                    </span>
                    <div className="nav-search-chips">
                      <a
                        href={`${root}#categories`}
                        className="nav-search-chip"
                        onClick={closeSearch}
                      >
                        Cooling & Fans
                      </a>
                      <a
                        href={`${root}#categories`}
                        className="nav-search-chip"
                        onClick={closeSearch}
                      >
                        Laundry Care
                      </a>
                      <a
                        href={`${root}#categories`}
                        className="nav-search-chip"
                        onClick={closeSearch}
                      >
                        Kitchen & Everyday
                      </a>
                      <a
                        href={`${root}#products`}
                        className="nav-search-chip"
                        onClick={closeSearch}
                      >
                        Showroom Highlights
                      </a>
                      <a
                        href={`${root}#visit`}
                        className="nav-search-chip"
                        onClick={closeSearch}
                      >
                        Visit NS Store
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
