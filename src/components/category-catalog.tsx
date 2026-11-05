"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StorefrontProduct } from "@/lib/public-catalog";
import type { CategoryRecord } from "@/lib/category-types";
import { ProductCard } from "@/components/product-card";
import styles from "./category-catalog.module.css";

interface CategoryCatalogProps {
  category: CategoryRecord;
  products: StorefrontProduct[];
  initialSubcategory?: string;
}

export function CategoryCatalog({
  category,
  products,
  initialSubcategory,
}: CategoryCatalogProps) {
  // Normalize initial subcategory
  const initialSub = useMemo(() => {
    if (!initialSubcategory || initialSubcategory === "all") return "all";
    const found = category.subcategories.find((s) => s.slug === initialSubcategory);
    return found ? found.slug : "all";
  }, [initialSubcategory, category.subcategories]);

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSub);

  // Products belonging strictly to this category
  const categoryProducts = useMemo(() => {
    return products.filter((p) => p.categorySlug === category.slug);
  }, [products, category.slug]);

  // Subcategories that actually have published products
  const activeSubcategories = useMemo(() => {
    return category.subcategories.filter((sub) =>
      categoryProducts.some((p) => p.subcategorySlug === sub.slug),
    );
  }, [category.subcategories, categoryProducts]);

  // Filtered products according to active subcategory
  const visibleProducts = useMemo(() => {
    if (selectedSubcategory === "all") return categoryProducts;
    return categoryProducts.filter((p) => p.subcategorySlug === selectedSubcategory);
  }, [categoryProducts, selectedSubcategory]);

  const handleSubcategoryChange = (subSlug: string) => {
    setSelectedSubcategory(subSlug);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (subSlug === "all") {
        url.searchParams.delete("sub");
      } else {
        url.searchParams.set("sub", subSlug);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const activeSubName =
    selectedSubcategory !== "all"
      ? category.subcategories.find((s) => s.slug === selectedSubcategory)?.name
      : null;

  const editorialGroupFormatted =
    category.editorial_group.charAt(0).toUpperCase() +
    category.editorial_group.slice(1).replace("-", " & ");

  return (
    <div className={styles.catalogMain}>
      {/* SECTION B: CATEGORY INTRODUCTION — Clean, non-redundant, restrained */}
      <header className={styles.categoryHeader}>
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/products" className={styles.breadcrumbLink}>
              Products
            </Link>
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              /
            </span>
            <Link
              href={`/products?category=${category.slug}`}
              className={styles.breadcrumbLink}
            >
              {editorialGroupFormatted}
            </Link>
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              /
            </span>
            <span className={styles.breadcrumbCurrent}>{category.name}</span>
          </nav>

          <h1 className={styles.categoryTitle}>{category.name}</h1>

          {category.description ? (
            <p className={styles.categoryDescription}>{category.description}</p>
          ) : null}
        </div>
      </header>

      {/* SECTION C: SUBCATEGORY FILTERING — Rendered only if multiple subcategories have products */}
      {activeSubcategories.length > 1 ? (
        <nav
          className={styles.filterBar}
          aria-label={`${category.name} subcategory filters`}
        >
          <button
            type="button"
            className={`${styles.filterPill} ${
              selectedSubcategory === "all" ? styles.filterPillActive : ""
            }`}
            onClick={() => handleSubcategoryChange("all")}
          >
            All {category.name}
          </button>

          {activeSubcategories.map((sub) => {
            const isActive = selectedSubcategory === sub.slug;

            return (
              <button
                key={sub.slug}
                type="button"
                className={`${styles.filterPill} ${
                  isActive ? styles.filterPillActive : ""
                }`}
                onClick={() => handleSubcategoryChange(sub.slug)}
              >
                {sub.name}
              </button>
            );
          })}
        </nav>
      ) : null}

      {/* SECTION D: ADAPTIVE PRODUCT DISPLAY ARCHITECTURE */}
      <section aria-label={`${category.name} product list`}>
        {visibleProducts.length === 0 ? (
          /* Case 0: Empty state */
          <div className={styles.emptyState}>
            <h2 className={styles.emptyStateTitle}>
              {activeSubName
                ? `No models available in ${activeSubName}`
                : `No ${category.name.toLowerCase()} currently published`}
            </h2>
            <p className={styles.emptyStateText}>
              We are currently replenishing verified models in this selection.
            </p>
            {selectedSubcategory !== "all" ? (
              <button
                type="button"
                className={styles.emptyStateAction}
                onClick={() => handleSubcategoryChange("all")}
              >
                &larr; View All {category.name}
              </button>
            ) : (
              <Link href="/products" className={styles.emptyStateAction}>
                Browse All Products
              </Link>
            )}
          </div>
        ) : visibleProducts.length === 1 ? (
          /* Case 1: Exactly 1 Product -> Vertical Image-First Featured Card */
          <div className={styles.singleFeaturedWrap}>
            <ProductCard product={visibleProducts[0]} variant="featured" priority />
          </div>
        ) : (
          /* Case 2+: Multiple Products -> Responsive Adaptive Centered Grid */
          <div
            className={styles.productsGrid}
            role="region"
            aria-label={`${category.name} appliances`}
          >
            {visibleProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                variant="standard"
                priority={index === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
