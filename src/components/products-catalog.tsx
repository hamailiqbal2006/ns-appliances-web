"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StorefrontProduct } from "@/lib/public-catalog";
import type { CategoryRecord } from "@/lib/category-types";
import { ProductCard, FeaturedProductCard } from "@/components/product-card";
import styles from "./products-catalog.module.css";

interface ProductsCatalogProps {
  products: StorefrontProduct[];
  categories: CategoryRecord[];
  initialCategory?: string;
}

export function ProductsCatalog({
  products,
  categories,
  initialCategory,
}: ProductsCatalogProps) {
  // Normalize initial category slug if provided
  const validInitialSlug = useMemo(() => {
    if (!initialCategory || initialCategory === "all") return "all";
    const decoded = decodeURIComponent(initialCategory).toLowerCase().trim();
    const found = categories.find(
      (c) =>
        c.slug === decoded ||
        c.slug === initialCategory ||
        c.name.toLowerCase() === decoded ||
        c.slug.replace(/-machines$/, "") === decoded,
    );
    return found ? found.slug : "all";
  }, [initialCategory, categories]);

  const [prevInitial, setPrevInitial] = useState(validInitialSlug);
  const [selectedCategory, setSelectedCategory] = useState<string>(validInitialSlug);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");

  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll positions to show/hide arrows and edge fades
  const checkScrollLimits = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Buffer of 3px to avoid subpixel rounding errors
    setCanScrollLeft(scrollLeft > 3);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 3);
  }, []);

  // Set up resize and scroll listeners on the rail
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    checkScrollLimits();
    el.addEventListener("scroll", checkScrollLimits, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        checkScrollLimits();
      });
      ro.observe(el);
    }

    const handleResize = () => checkScrollLimits();
    window.addEventListener("resize", handleResize);

    return () => {
      el.removeEventListener("scroll", checkScrollLimits);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [checkScrollLimits, categories]);

  // Keep active category pill visible inside the rail
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>(`[data-active="true"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedCategory]);

  // Adjust state during render when initialCategory prop changes
  if (prevInitial !== validInitialSlug) {
    setPrevInitial(validInitialSlug);
    setSelectedCategory(validInitialSlug);
    setSelectedSubcategory("all");
  }

  // Handle category switch and update URL query param with pushState for full back/forward support
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedSubcategory("all");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (categorySlug === "all") {
        url.searchParams.delete("category");
      } else {
        url.searchParams.set("category", categorySlug);
      }
      url.searchParams.delete("subcategory");
      window.history.pushState({ category: categorySlug }, "", url.toString());
    }
  };

  // Listen to popstate for browser Back / Forward button navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const cat = url.searchParams.get("category");
      if (!cat) {
        setSelectedCategory("all");
      } else {
        const found = categories.find(
          (c) =>
            c.slug === cat ||
            c.name.toLowerCase() === cat.toLowerCase() ||
            c.slug.replace(/-machines$/, "") === cat,
        );
        setSelectedCategory(found ? found.slug : "all");
      }
      const sub = url.searchParams.get("subcategory") || "all";
      setSelectedSubcategory(sub);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [categories]);

  // Smooth scroll category rail by ~280px or 70% of client width
  const scrollRail = (direction: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const amount = Math.min(Math.max(el.clientWidth * 0.65, 220), 340);
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  // Active category record
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.slug === selectedCategory);
  }, [categories, selectedCategory]);

  // Filtered products for specific category view
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;

    return products.filter((p) => {
      const matchesCategory = p.categorySlug === selectedCategory;
      if (!matchesCategory) return false;
      if (selectedSubcategory === "all") return true;
      return p.subcategorySlug === selectedSubcategory;
    });
  }, [products, selectedCategory, selectedSubcategory]);

  // Subcategories that actually have products in the current category
  const activeSubcategories = useMemo(() => {
    if (!currentCategory) return [];
    return currentCategory.subcategories.filter((sub) =>
      products.some(
        (p) => p.categorySlug === currentCategory.slug && p.subcategorySlug === sub.slug,
      ),
    );
  }, [currentCategory, products]);

  return (
    <div className={styles.catalogContainer}>
      {/* Primary Category Navigation Rail with Interactive Scroll Controls */}
      <div className={styles.railWrapper}>
        {/* Left Edge Fade */}
        <div
          className={`${styles.edgeFade} ${styles.edgeFadeLeft} ${
            canScrollLeft ? styles.edgeFadeVisible : ""
          }`}
          aria-hidden="true"
        />

        {/* Left Arrow Button */}
        <button
          type="button"
          className={`${styles.railArrow} ${styles.railArrowLeft} ${
            canScrollLeft ? styles.railArrowVisible : ""
          }`}
          onClick={() => scrollRail("left")}
          disabled={!canScrollLeft}
          aria-label="Scroll categories backward"
          tabIndex={canScrollLeft ? 0 : -1}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Horizontal Category Nav */}
        <nav
          ref={railRef}
          className={styles.categoryNav}
          aria-label="Filter appliances by category"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            id="tab-all"
            aria-selected={selectedCategory === "all"}
            data-active={selectedCategory === "all"}
            className={`${styles.categoryPill} ${
              selectedCategory === "all" ? styles.categoryPillActive : ""
            }`}
            onClick={() => handleCategorySelect("all")}
          >
            All Products
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategory === cat.slug;

            return (
              <button
                key={cat.slug}
                type="button"
                role="tab"
                id={`tab-${cat.slug}`}
                aria-selected={isActive}
                data-active={isActive}
                className={`${styles.categoryPill} ${
                  isActive ? styles.categoryPillActive : ""
                }`}
                onClick={() => handleCategorySelect(cat.slug)}
              >
                {cat.name}
              </button>
            );
          })}
        </nav>

        {/* Right Edge Fade */}
        <div
          className={`${styles.edgeFade} ${styles.edgeFadeRight} ${
            canScrollRight ? styles.edgeFadeVisible : ""
          }`}
          aria-hidden="true"
        />

        {/* Right Arrow Button */}
        <button
          type="button"
          className={`${styles.railArrow} ${styles.railArrowRight} ${
            canScrollRight ? styles.railArrowVisible : ""
          }`}
          onClick={() => scrollRail("right")}
          disabled={!canScrollRight}
          aria-label="Scroll categories forward"
          tabIndex={canScrollRight ? 0 : -1}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Subcategory Filter Chips — Only rendered if multiple subcategories have products */}
      {activeSubcategories.length > 1 ? (
        <div className={styles.subcategoryChips} aria-label="Subcategory filters">
          <button
            type="button"
            className={`${styles.subcategoryChip} ${
              selectedSubcategory === "all" ? styles.subcategoryChipActive : ""
            }`}
            onClick={() => setSelectedSubcategory("all")}
          >
            All {currentCategory?.name}
          </button>
          {activeSubcategories.map((sub) => {
            const isActive = selectedSubcategory === sub.slug;
            return (
              <button
                key={sub.slug}
                type="button"
                className={`${styles.subcategoryChip} ${
                  isActive ? styles.subcategoryChipActive : ""
                }`}
                onClick={() => setSelectedSubcategory(sub.slug)}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* View Mode 1: All Products — Coherent, high-density responsive grid */}
      {selectedCategory === "all" ? (
        <div>
          {products.length === 0 ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyStateTitle}>No products published yet</h3>
              <p className={styles.emptyStateText}>
                Catalog items will appear automatically once published through the admin portal.
              </p>
            </div>
          ) : products.length === 1 ? (
            <div className={styles.singleFeaturedWrap}>
              <FeaturedProductCard product={products[0]} />
            </div>
          ) : (
            <div
              className={styles.productsGrid}
              role="region"
              aria-label="All published appliances"
            >
              {products.map((product, pIdx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={pIdx}
                  priority={pIdx === 0}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* View Mode 2: Filtered Category View */
        <div>
          <div className={styles.activeCategoryHeader}>
            <h2 className={styles.activeCategoryTitle}>{currentCategory?.name}</h2>
            <span className={styles.activeCategoryCount}>
              {categoryFilteredProducts.length}{" "}
              {categoryFilteredProducts.length === 1 ? "Product" : "Products"}
            </span>
          </div>

          {categoryFilteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyStateTitle}>
                No models available in {currentCategory?.name || "this category"}
              </h3>
              <p className={styles.emptyStateText}>
                We are currently curating verified appliances for this selection.
              </p>
              <button
                type="button"
                className={styles.emptyStateBtn}
                onClick={() => handleCategorySelect("all")}
              >
                &larr; View All Products
              </button>
            </div>
          ) : categoryFilteredProducts.length === 1 ? (
            /* 1 Product -> Featured Split Layout */
            <div className={styles.singleFeaturedWrap}>
              <FeaturedProductCard product={categoryFilteredProducts[0]} />
            </div>
          ) : (
            /* 2+ Products -> Adaptive Responsive Centered Grid */
            <div
              className={styles.productsGrid}
              role="region"
              aria-label={`${currentCategory?.name} appliances`}
            >
              {categoryFilteredProducts.map((product, pIdx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={pIdx}
                  priority={pIdx === 0}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
