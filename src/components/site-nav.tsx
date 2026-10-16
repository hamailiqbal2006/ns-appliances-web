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

const getScrollSnapshot = () => window.scrollY > 120;
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

  const { scrollY } = useScroll();
  const startScroll = 28;
  const dockDistance = 142;

  // Center brand docking animation
  const brandOpacity = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail || shouldReduceMotion ? [1, 1] : [0, 1]
  );

  const brandScale = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail || shouldReduceMotion ? [1, 1] : [0.94, 1]
  );

  const brandY = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail || shouldReduceMotion ? [0, 0] : [6, 0]
  );

  // Synchronized navbar shell styling across scroll range [28, 142]
  const navBg = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail
      ? ["rgba(12, 18, 20, 0.82)", "rgba(12, 18, 20, 0.82)"]
      : ["rgba(225, 232, 229, 0)", "rgba(225, 232, 229, 0.46)"]
  );

  const navBorderColor = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail
      ? ["rgba(255, 255, 255, 0.14)", "rgba(255, 255, 255, 0.14)"]
      : ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.36)"]
  );

  const navShadow = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail
      ? [
          "0 20px 48px -12px rgba(0, 0, 0, 0.45)",
          "0 20px 48px -12px rgba(0, 0, 0, 0.45)",
        ]
      : [
          "0 0 0 rgba(10, 28, 30, 0)",
          "0 18px 44px -12px rgba(10, 28, 30, 0.20)",
        ]
  );

  const navGlassOpacity = useTransform(
    scrollY,
    [startScroll, dockDistance],
    detail ? [1, 1] : [0, 1]
  );

  const navTextColor = useTransform(
    scrollY,
    [startScroll, dockDistance],
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
      <motion.header
        className={`site-nav ${detail ? "site-nav-detail" : "site-nav-home"} ${isScrolled ? "is-scrolled" : "is-top"}`}
        aria-label="Primary navigation"
        style={
          detail || shouldReduceMotion
            ? undefined
            : {
                backgroundColor: navBg,
                borderColor: navBorderColor,
                boxShadow: navShadow,
                color: navTextColor,
              }
        }
      >
        <motion.div
          className="site-nav-glass"
          style={
            detail || shouldReduceMotion
              ? undefined
              : { opacity: navGlassOpacity }
          }
          aria-hidden
        />
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

          {/* ZONE 2: CENTER TITLE */}
          <div className="site-nav-center">
            <motion.div
              className="nav-brand-wrap"
              style={
                detail || shouldReduceMotion
                  ? undefined
                  : {
                      opacity: brandOpacity,
                      scale: brandScale,
                      y: brandY,
                      color: navTextColor,
                      transformOrigin: "center center",
                    }
              }
            >
              <motion.div
                className="nav-brand-entrance"
                initial={
                  shouldReduceMotion
                    ? false
                    : {
                        opacity: 0,
                        y: 30,
                        clipPath: "inset(0 0 100% 0)",
                        letterSpacing: "0.02em",
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  clipPath: "inset(0 0 0% 0)",
                  letterSpacing: "-0.01em",
                }}
                transition={{
                  duration: shouldReduceMotion ? 0.001 : 0.95,
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
      </motion.header>

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
