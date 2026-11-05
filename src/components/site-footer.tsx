"use client";

import { forwardRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories } from "@/data/catalog";
import { SHOWROOM_LOCATION } from "@/lib/showroom-location";

const emptySubscribe = () => () => {};

export interface SiteFooterProps {
  variant?: "glass-overlay" | "static";
  className?: string;
  onCategoryClick?: (index: number) => void;
  onSectionClick?: (id: string) => void;
}

export const SiteFooter = forwardRef<HTMLElement, SiteFooterProps>(
  function SiteFooter(
    { className = "", onCategoryClick, onSectionClick },
    ref
  ) {
    const pathname = usePathname();
    const isHome = pathname === "/";

    const currentYear = useSyncExternalStore(
      emptySubscribe,
      () => new Date().getFullYear(),
      () => 2026
    );

    const handleBackToTop = (e: React.MouseEvent) => {
      e.preventDefault();
      if (typeof window !== "undefined" && window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleHomeClick = (e: React.MouseEvent) => {
      if (isHome) {
        handleBackToTop(e);
      }
    };

    const handleCategoryClick = (e: React.MouseEvent, index: number) => {
      if (onCategoryClick) {
        e.preventDefault();
        onCategoryClick(index);
      }
    };

    const handleSectionClick = (e: React.MouseEvent, id: string) => {
      if (onSectionClick) {
        e.preventDefault();
        onSectionClick(id);
      }
    };

    return (
      <footer
        ref={ref}
        className={`site-footer ${className}`}
        role="contentinfo"
        aria-label="Site footer"
      >
        <div className="site-footer-inner">
          {/* MAIN FOOTER ROW: BRAND (LEFT) + NAVIGATION COLUMNS (RIGHT) */}
          <div className="site-footer-main">
            {/* COLUMN 1 — BRAND */}
            <div className="site-footer-brand">
              <h2 className="site-footer-brand-name">
                <Link
                  href="/"
                  onClick={handleHomeClick}
                >
                  NS Home Appliances
                </Link>
              </h2>
              <p className="site-footer-tagline">Comfort made better.</p>
              <p className="site-footer-desc">
                Reliable appliances engineered for lasting comfort and everyday performance.
              </p>
            </div>

            {/* COLUMN 2 — EXPLORE */}
            <div className="site-footer-col">
              <h3 className="site-footer-col-heading">Explore</h3>
              <ul className="site-footer-link-list">
                <li>
                  <Link
                    href="/"
                    className="site-footer-link"
                    onClick={handleHomeClick}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="site-footer-link">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#categories"
                    className="site-footer-link"
                    onClick={(e) => handleSectionClick(e, "categories")}
                  >
                    Shop by Category
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#visit"
                    className="site-footer-link"
                    onClick={(e) => handleSectionClick(e, "visit")}
                  >
                    Visit Our Store
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 3 — CATEGORIES */}
            <div className="site-footer-col">
              <h3 className="site-footer-col-heading">Categories</h3>
              <ul className="site-footer-link-list">
                {categories.map((cat, idx) => (
                  <li key={cat.slug}>
                    <Link
                      href="/#categories"
                      className="site-footer-link"
                      onClick={(e) => handleCategoryClick(e, idx)}
                    >
                      {cat.name === "Home" ? "Home Appliances" : cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* COLUMN 4 — CUSTOMER SUPPORT */}
            <div className="site-footer-col">
              <h3 className="site-footer-col-heading">Support</h3>
              <ul className="site-footer-link-list">
                <li>
                  <Link href="/faq" className="site-footer-link">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="site-footer-link">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <a
                    href={SHOWROOM_LOCATION.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer-link"
                    aria-label="NS Home Appliances on Google Maps"
                  >
                    Google Maps Location
                  </a>
                </li>
              </ul>
            </div>

            {/* COLUMN 5 — COMPANY */}
            <div className="site-footer-col">
              <h3 className="site-footer-col-heading">Company</h3>
              <ul className="site-footer-link-list">
                <li>
                  <Link href="/about" className="site-footer-link">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="site-footer-link">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="site-footer-divider" aria-hidden="true" />

          {/* BOTTOM COPYRIGHT ROW */}
          <div className="site-footer-bottom">
            <p className="site-footer-copyright">
              &copy; {currentYear} NS Home Appliances. All rights reserved.
            </p>
            <a
              href="#top"
              className="site-footer-back-top"
              onClick={handleBackToTop}
            >
              Back to Top <span aria-hidden="true">&uarr;</span>
            </a>
          </div>
        </div>
      </footer>
    );
  }
);
