export type EditorialGroup = "cooling" | "laundry" | "kitchen-everyday" | "home";

export interface SubcategoryItem {
  name: string;
  slug: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  editorial_group: EditorialGroup;
  display_order: number;
  is_active: boolean;
  subcategories: SubcategoryItem[];
  created_at?: string;
  updated_at?: string;
  product_count?: number;
}

export const EDITORIAL_GROUPS: Array<{ slug: EditorialGroup; name: string }> = [
  { slug: "cooling", name: "Cooling" },
  { slug: "laundry", name: "Laundry" },
  { slug: "kitchen-everyday", name: "Kitchen & Everyday" },
  { slug: "home", name: "Home" },
];

/**
 * 9 Approved NS Home Appliances Physical Categories.
 * Mapped to the 4 approved editorial presentation groups.
 */
export const DEFAULT_CATEGORIES: CategoryRecord[] = [
  {
    id: "cat-iron-machines",
    name: "Iron Machines",
    slug: "iron-machines",
    description: "High-grade dry and steam pressing irons built for everyday fabric care.",
    editorial_group: "kitchen-everyday",
    display_order: 1,
    is_active: true,
    subcategories: [
      { name: "Dry Irons", slug: "dry-irons" },
      { name: "Steam Irons", slug: "steam-irons" },
    ],
  },
  {
    id: "cat-washing-machines",
    name: "Washing Machines",
    slug: "washing-machines",
    description: "Heavy-duty washing machines engineered for superior fabric wash and longevity.",
    editorial_group: "laundry",
    display_order: 2,
    is_active: true,
    subcategories: [
      { name: "Single Tub Washer", slug: "single-tub" },
      { name: "Twin Tub Washer", slug: "twin-tub" },
      { name: "Automatic Washer", slug: "automatic" },
    ],
  },
  {
    id: "cat-dryer-machines",
    name: "Dryer Machines",
    slug: "dryer-machines",
    description: "High-RPM spin dryers and fast drying solutions for delicate and heavy clothing.",
    editorial_group: "laundry",
    display_order: 3,
    is_active: true,
    subcategories: [
      { name: "Spin Dryer", slug: "spin-dryer" },
    ],
  },
  {
    id: "cat-room-coolers",
    name: "Room Coolers",
    slug: "room-coolers",
    description: "Powerful desert and plastic air room coolers for peak summer heat relief.",
    editorial_group: "cooling",
    display_order: 4,
    is_active: true,
    subcategories: [
      { name: "Plastic Body Cooler", slug: "plastic-body" },
      { name: "Metal Body Desert Cooler", slug: "metal-body" },
    ],
  },
  {
    id: "cat-juicer-blenders",
    name: "Juicer Blenders",
    slug: "juicer-blenders",
    description: "Multi-functional kitchen blenders, spice grinders, and juice extractors.",
    editorial_group: "kitchen-everyday",
    display_order: 5,
    is_active: true,
    subcategories: [
      { name: "Juicer Blender — 2-in-1", slug: "2-in-1" },
      { name: "Juicer Blender — 3-in-1", slug: "3-in-1" },
      { name: "Juicer Blender — 4-in-1", slug: "4-in-1" },
    ],
  },
  {
    id: "cat-pedestal-fans",
    name: "Pedestal Fans",
    slug: "pedestal-fans",
    description: "High-velocity stand fans with pure copper windings and oscillation control.",
    editorial_group: "cooling",
    display_order: 6,
    is_active: true,
    subcategories: [
      { name: "Standard Pedestal Fan", slug: "standard-pedestal" },
      { name: "Inverter DC Pedestal Fan", slug: "inverter-pedestal" },
    ],
  },
  {
    id: "cat-ceiling-fans",
    name: "Ceiling Fans",
    slug: "ceiling-fans",
    description: "Energy-efficient ceiling fans offering maximum air delivery and quiet performance.",
    editorial_group: "cooling",
    display_order: 7,
    is_active: true,
    subcategories: [
      { name: "Deluxe AC Ceiling Fan", slug: "deluxe-model" },
      { name: "Inverter BLDC Ceiling Fan", slug: "inverter-model" },
    ],
  },
  {
    id: "cat-geysers",
    name: "Geysers",
    slug: "geysers",
    description: "Instant, electric, and gas water heaters designed for maximum safety and winter comfort.",
    editorial_group: "home",
    display_order: 8,
    is_active: true,
    subcategories: [
      { name: "Instant Gas Geyser", slug: "instant-geyser" },
      { name: "Electric Storage Geyser", slug: "electric-geyser" },
      { name: "Dual Gas & Electric Geyser", slug: "dual-geyser" },
    ],
  },
  {
    id: "cat-metal-safe-almirahs",
    name: "Metal Safe Almirahs",
    slug: "metal-safe-almirahs",
    description: "Reinforced steel wardrobes and secure tijori lockers for reliable household protection.",
    editorial_group: "home",
    display_order: 9,
    is_active: true,
    subcategories: [
      { name: "Single Door Almirah", slug: "single-door" },
      { name: "Double Door Almirah", slug: "double-door" },
      { name: "Locker Safe / Tijori", slug: "locker-safe" },
    ],
  },
];

/**
 * Normalizes legacy slugs/aliases to the canonical category slugs.
 */
export function normalizeCategorySlug(slug: string): string {
  const s = slug.toLowerCase().trim();
  if (s === "irons" || s === "iron") return "iron-machines";
  if (s === "dryers" || s === "dryer") return "dryer-machines";
  if (s === "juicers-blenders" || s === "juicers" || s === "blenders") return "juicer-blenders";
  return s;
}

/**
 * Resolves which canonical category a product belongs to, supporting both
 * direct category slugs and legacy editorial-group/subcategory assignments.
 */
export function resolveCategoryForProduct(
  categorySlug: string,
  subcategorySlug?: string | null,
  allCategories: CategoryRecord[] = DEFAULT_CATEGORIES,
): CategoryRecord {
  const normCat = normalizeCategorySlug(categorySlug);
  const normSub = subcategorySlug ? normalizeCategorySlug(subcategorySlug) : null;

  // 1. Direct match on categorySlug
  const directCat = allCategories.find((c) => c.slug === normCat);
  if (directCat) return directCat;

  // 2. Match on subcategorySlug if categorySlug was the editorial group (e.g., 'cooling' + 'room-coolers')
  if (normSub) {
    const directSub = allCategories.find((c) => c.slug === normSub);
    if (directSub) return directSub;
  }

  // 3. Fallback: Check if subcategorySlug matches any subcategory within a category
  if (normSub) {
    const parent = allCategories.find((c) =>
      c.subcategories.some((s) => s.slug === normSub || s.slug === subcategorySlug),
    );
    if (parent) return parent;
  }

  // 4. Fallback: match by editorial group
  const byGroup = allCategories.find((c) => c.editorial_group === normCat);
  if (byGroup) return byGroup;

  // 5. Ultimate fallback
  return allCategories[0] || DEFAULT_CATEGORIES[0];
}
