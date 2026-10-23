"use client";

import { forwardRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { categories } from "@/data/catalog";

const emptySubscribe = () => () => {};

export interface SiteFooterProps {
  variant?: "glass-overlay" | "static";
  onCategoryClick?: (index: number) => void;
  onSectionClick?: (id: string) => void;
}

export const SiteFooter = forwardRef<HTMLElement, SiteFooterProps>(
  function SiteFooter(
    { variant = "static", onCategoryClick, onSectionClick },
    ref
  ) {
    const currentYear = useSyncExternalStore(
      emptySubscribe,
      () => new Date().getFullYear(),
      () => 2026
    );

    const isGlass = variant === "glass-overlay";

    const handleBackToTop = (e: React.MouseEvent) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        className={`site-footer ${isGlass ? "site-footer-glass" : "site-footer-static"}`}
        role="contentinfo"
        aria-label="Site footer"
      >
        <div className="footer-full-container">
          {/* Upper Region: 4-Column Retail Layout */}
          <div className="footer-main-grid">
            {/* COLUMN 1 — BRAND */}
            <div className="footer-col footer-col-brand">
              <h2 className="footer-brand-title">
                <Link
                  href="/"
                  onClick={(e) => {
                    if (isGlass) {
                      handleBackToTop(e);
                    }
                  }}
                >
                  NS Home Appliances
                </Link>
              </h2>
              <p className="footer-brand-tagline">Comfort made better.</p>
              <p className="footer-brand-sub">
                Physical showroom and digital appliance exploration catalog.
              </p>
            </div>

            {/* COLUMN 2 — EXPLORE */}
            <div className="footer-col">
              <h3 className="footer-col-heading">Explore</h3>
              <ul className="footer-link-list">
                <li>
                  <Link
                    href="/"
                    className="footer-nav-link"
                    onClick={(e) => {
                      if (isGlass) {
                        handleBackToTop(e);
                      }
                    }}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="footer-nav-link">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#categories"
                    className="footer-nav-link"
                    onClick={(e) => handleSectionClick(e, "categories")}
                  >
                    Shop by Category
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#visit"
                    className="footer-nav-link"
                    onClick={(e) => handleSectionClick(e, "visit")}
                  >
                    Visit Our Store
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 3 — INFORMATION */}
            <div className="footer-col">
              <h3 className="footer-col-heading">Information</h3>
              <ul className="footer-link-list">
                <li>
                  <Link href="/about" className="footer-nav-link">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="footer-nav-link">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="footer-nav-link">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="footer-nav-link">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 4 — SHOP CATEGORIES */}
            <div className="footer-col">
              <h3 className="footer-col-heading">Shop Categories</h3>
              <ul className="footer-link-list">
                {categories.map((cat, idx) => (
                  <li key={cat.slug}>
                    <Link
                      href="/#categories"
                      className="footer-nav-link"
                      onClick={(e) => handleCategoryClick(e, idx)}
                    >
                      {cat.name === "Home" ? "Home Appliances" : cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Lower Region: Divider, Copyright & Back to Top */}
          <div className="footer-full-bottom">
            <p className="footer-full-copyright">
              &copy; {currentYear} NS Home Appliances. All rights reserved.
            </p>
            <a
              href="#top"
              className="footer-full-back-top"
              onClick={handleBackToTop}
            >
              Back to top <span aria-hidden="true">&uarr;</span>
            </a>
          </div>
        </div>
      </footer>
    );
  }
);
