"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { type Product, products } from "@/data/catalog";

const CATEGORY_TABS = [
  { label: "All Products", value: "all" },
  { label: "Cooling", value: "Cooling" },
  { label: "Laundry", value: "Laundry" },
  { label: "Kitchen & Everyday", value: "Kitchen & Everyday" },
  { label: "Home Appliances", value: "Home" },
];

export function ProductsCatalog() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div>
      <div className="catalog-notice" role="note">
        <b>Showroom Catalog Note:</b> Digital listings display representative model
        cutouts while NS inventory data is finalized. Exact model numbers, energy ratings,
        and warranty terms are confirmed directly at our showroom.
      </div>

      <div
        className="catalog-tabs"
        role="tablist"
        aria-label="Filter appliances by category"
      >
        {CATEGORY_TABS.map((tab) => {
          const isActive = selectedCategory === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`catalog-tab ${isActive ? "is-active" : ""}`}
              onClick={() => setSelectedCategory(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="catalog-grid"
        role="region"
        aria-label="Appliance product cards"
      >
        {filteredProducts.map((product: Product) => (
          <Link
            key={product.slug}
            href={`/products/${product.slug}`}
            className="catalog-card"
          >
            <div className="catalog-card-image">
              <Image
                src={product.image}
                alt={`${product.name} cutout`}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                style={{
                  objectFit: "contain",
                  padding: "16px",
                  transform: `scale(${product.art.scale * 0.88})`,
                }}
              />
            </div>
            <div className="catalog-card-body">
              <span className="catalog-card-cat">
                {product.category === "Home" ? "Home Appliances" : product.category}
              </span>
              <h3 className="catalog-card-name">{product.name}</h3>
              <p className="catalog-card-kind">{product.kind}</p>
              <div className="catalog-card-action">
                <span>View Product Details</span>
                <span aria-hidden="true">&rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
