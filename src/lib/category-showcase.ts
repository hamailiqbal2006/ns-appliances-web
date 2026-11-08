import { categories as defaultCategories } from "@/data/catalog";

export type BackgroundType = "solid" | "gradient";

export interface CategoryShowcaseItem {
  id: string;
  categorySlug: "cooling" | "laundry" | "kitchen-everyday" | "home";
  categoryName: string;
  displayHeading: string;
  sortOrder: number;
  leftBgType: BackgroundType;
  leftBgColor: string;
  leftGradientEnd: string;
  leftGradientAngle: number;
  rightBgType: BackgroundType;
  rightBgColor: string;
  rightGradientEnd: string;
  rightGradientAngle: number;
  imagePath: string | null;
  imageUrl: string;
  imageScale: number;
  imageX: number;
  imageY: number;
  subcategories: Array<{ name: string; slug: string }>;
  defaultImage: string;
  defaultScale: number;
  defaultX: number;
  defaultY: number;
  defaultMobileScale?: number;
  defaultMobileY?: number;
  defaultLeftBg: string;
  defaultRightBg: string;
  defaultInk: string;
}

export type CategoryShowcaseRow = {
  id: string;
  category_slug: string;
  display_heading: string | null;
  sort_order: number;
  left_bg_type: string;
  left_bg_color: string;
  left_gradient_end: string | null;
  left_gradient_angle: number | null;
  right_bg_type: string;
  right_bg_color: string;
  right_gradient_end: string | null;
  right_gradient_angle: number | null;
  image_path: string | null;
  image_scale: number | null;
  image_x: number | null;
  image_y: number | null;
  created_at?: string;
  updated_at?: string;
};

/** Default approved showcase presets mapped directly from catalog categories */
export function getDefaultCategoryShowcase(): CategoryShowcaseItem[] {
  return defaultCategories.map((cat, index) => ({
    id: `default-${cat.slug}`,
    categorySlug: cat.slug as "cooling" | "laundry" | "kitchen-everyday" | "home",
    categoryName: cat.name,
    displayHeading: cat.name,
    sortOrder: index,
    leftBgType: "solid",
    leftBgColor: cat.palette.base,
    leftGradientEnd: "#d8dcd9",
    leftGradientAngle: 135,
    rightBgType: "solid",
    rightBgColor: cat.palette.panel,
    rightGradientEnd: "#0d282c",
    rightGradientAngle: 135,
    imagePath: null,
    imageUrl: cat.image,
    imageScale: 1.0,
    imageX: 0,
    imageY: 0,
    subcategories: cat.subcategories,
    defaultImage: cat.image,
    defaultScale: cat.art.scale,
    defaultX: cat.art.x,
    defaultY: cat.art.y,
    defaultMobileScale: cat.art.mobileScale,
    defaultMobileY: cat.art.mobileY,
    defaultLeftBg: cat.palette.base,
    defaultRightBg: cat.palette.panel,
    defaultInk: cat.palette.ink,
  }));
}

/** Relative luminance calculation according to WCAG 2.1 specifications */
export function getLuminance(hexColor: string): number {
  const hex = (hexColor || "#FFFFFF").replace(/^#/, "");
  const fullHex = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const rgb = parseInt(fullHex, 16);
  if (Number.isNaN(rgb)) return 1;
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/** Contrast ratio between two colors (range 1:1 to 21:1) */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/** Evaluates background readability and returns the recommended accessible text ink */
export function getRecommendedTextColor(bgColor: string): {
  color: string;
  ratio: number;
  meetsWCAG: boolean;
} {
  const darkRatio = getContrastRatio(bgColor, "#172323");
  const lightRatio = getContrastRatio(bgColor, "#FFFFFF");
  if (darkRatio >= lightRatio) {
    return { color: "#172323", ratio: Math.round(darkRatio * 10) / 10, meetsWCAG: darkRatio >= 4.5 };
  }
  return { color: "#FFFFFF", ratio: Math.round(lightRatio * 10) / 10, meetsWCAG: lightRatio >= 4.5 };
}

/** Generates clean CSS background specification for solid color or linear gradient */
export function resolveCssBackground(
  type: BackgroundType,
  color: string,
  endColor?: string,
  angle = 135,
): string {
  if (type === "gradient" && endColor) {
    return `linear-gradient(${angle}deg, ${color} 0%, ${endColor} 100%)`;
  }
  return color;
}

/** Resolves public image URL for a category showcase storage path */
export function showcaseImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/")) return path;
  return `/api/product-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Merges database rows with catalog metadata */
export function mergeShowcaseRows(rows: CategoryShowcaseRow[]): CategoryShowcaseItem[] {
  const defaults = getDefaultCategoryShowcase();
  if (!rows || rows.length === 0) return defaults;

  const rowMap = new Map(rows.map((r) => [r.category_slug, r]));

  // Build items in saved sort_order
  const matched: CategoryShowcaseItem[] = [];
  for (const row of rows) {
    const def = defaults.find((d) => d.categorySlug === row.category_slug);
    if (!def) continue;
    matched.push({
      id: row.id,
      categorySlug: def.categorySlug,
      categoryName: def.categoryName,
      displayHeading: row.display_heading?.trim() || def.categoryName,
      sortOrder: row.sort_order ?? 0,
      leftBgType: (row.left_bg_type === "gradient" ? "gradient" : "solid") as BackgroundType,
      leftBgColor: row.left_bg_color || def.defaultLeftBg,
      leftGradientEnd: row.left_gradient_end || "#d8dcd9",
      leftGradientAngle: row.left_gradient_angle ?? 135,
      rightBgType: (row.right_bg_type === "gradient" ? "gradient" : "solid") as BackgroundType,
      rightBgColor: row.right_bg_color || def.defaultRightBg,
      rightGradientEnd: row.right_gradient_end || "#0d282c",
      rightGradientAngle: row.right_gradient_angle ?? 135,
      imagePath: row.image_path,
      imageUrl: showcaseImageUrl(row.image_path) || def.defaultImage,
      imageScale: Math.max(0.75, Math.min(1.25, Number(row.image_scale) || 1.0)),
      imageX: Math.max(-15, Math.min(15, Number(row.image_x) || 0)),
      imageY: Math.max(-15, Math.min(15, Number(row.image_y) || 0)),
      subcategories: def.subcategories,
      defaultImage: def.defaultImage,
      defaultScale: def.defaultScale,
      defaultX: def.defaultX,
      defaultY: def.defaultY,
      defaultMobileScale: def.defaultMobileScale,
      defaultMobileY: def.defaultMobileY,
      defaultLeftBg: def.defaultLeftBg,
      defaultRightBg: def.defaultRightBg,
      defaultInk: def.defaultInk,
    });
  }

  matched.sort((a, b) => a.sortOrder - b.sortOrder);

  // Append any missing catalog categories
  for (const def of defaults) {
    if (!rowMap.has(def.categorySlug)) {
      matched.push({ ...def, sortOrder: matched.length });
    }
  }

  return matched;
}
