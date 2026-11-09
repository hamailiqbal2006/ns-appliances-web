import Link from "next/link";
import styles from "./product-metadata.module.css";

export interface ProductCategoryBreadcrumbProps {
  category: string;
  categorySlug: string;
  subcategory?: string | null;
  subcategorySlug?: string | null;
}

export function ProductCategoryBreadcrumb({
  category,
  categorySlug,
  subcategory,
  subcategorySlug,
}: ProductCategoryBreadcrumbProps) {
  // Validate subcategory: ignore undefined, null, empty, or duplicate of category
  const hasDistinctSubcategory = Boolean(
    subcategory &&
      subcategory.trim() &&
      subcategory.trim().toLowerCase() !== "undefined" &&
      subcategory.trim().toLowerCase() !== "null" &&
      subcategory.trim().toLowerCase() !== category.trim().toLowerCase(),
  );

  const cleanSub = subcategory?.trim();
  const subcategoryHref =
    hasDistinctSubcategory && subcategorySlug
      ? `/category/${categorySlug}/${subcategorySlug}`
      : undefined;

  return (
    <nav className={styles.categoryBreadcrumb} aria-label="Product category breadcrumb">
      <Link href={`/category/${categorySlug}`} className={styles.categoryLink}>
        {category}
      </Link>
      {hasDistinctSubcategory && cleanSub && (
        <>
          <span className={styles.categoryDivider} aria-hidden="true">
            /
          </span>
          {subcategoryHref ? (
            <Link href={subcategoryHref} className={styles.subcategoryLink}>
              {cleanSub}
            </Link>
          ) : (
            <span className={styles.subcategoryText}>{cleanSub}</span>
          )}
        </>
      )}
    </nav>
  );
}

export interface ProductAttributeItem {
  label: string;
  value: string;
}

export interface ProductMetadataProps {
  brand?: string | null;
  modelNumber?: string | null;
  washingCapacity?: string | null;
  juicerConfiguration?: string | null;
  specifications?: Record<string, string>;
  className?: string;
}

export function ProductMetadata({
  brand,
  modelNumber,
  washingCapacity,
  juicerConfiguration,
  specifications = {},
  className = "",
}: ProductMetadataProps) {
  // Brand resolution: Full approved name NS Home Appliances for NS-branded products
  const displayBrand = (() => {
    const b = brand?.trim();
    if (!b || /^ns(\s*home|\s*appliances|\s*home\s*appliances)?$/i.test(b)) {
      return "NS Home Appliances";
    }
    return b;
  })();

  const cleanModel = modelNumber?.trim();

  // Category-specific attribute list
  const attributeItems: ProductAttributeItem[] = [];

  // Washing machine capacity
  if (washingCapacity?.trim()) {
    attributeItems.push({
      label: "Washing Capacity",
      value: washingCapacity.trim(),
    });
  }

  // Juicer configuration
  if (juicerConfiguration?.trim()) {
    attributeItems.push({
      label: "Configuration",
      value: juicerConfiguration.trim(),
    });
  }

  // Common high-priority specifications for other categories if genuine values exist
  if (attributeItems.length === 0 && specifications) {
    const candidateKeys = [
      "Configuration",
      "Wash Capacity",
      "Tank Capacity",
      "Sweep Size",
      "Capacity",
      "Dimensions",
      "Motor Type",
      "Power Consumption",
    ];

    for (const key of candidateKeys) {
      const val = specifications[key]?.trim();
      if (val && !attributeItems.some((a) => a.label.toLowerCase() === key.toLowerCase())) {
        attributeItems.push({ label: key, value: val });
        if (attributeItems.length >= 2) break;
      }
    }
  }

  return (
    <div className={`${styles.metadataCard} ${className}`.trim()} aria-label="Product identification">
      <dl className={styles.metadataList}>
        <div className={styles.metadataItem}>
          <dt className={styles.metadataLabel}>Brand</dt>
          <dd className={styles.metadataValue}>{displayBrand}</dd>
        </div>

        {cleanModel && (
          <div className={styles.metadataItem}>
            <dt className={styles.metadataLabel}>Model</dt>
            <dd className={styles.metadataValue}>{cleanModel}</dd>
          </div>
        )}

        {attributeItems.map((item) => (
          <div key={item.label} className={styles.metadataItem}>
            <dt className={styles.metadataLabel}>{item.label}</dt>
            <dd className={styles.metadataValue}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
