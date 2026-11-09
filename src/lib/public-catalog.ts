import "server-only";

import { products, type ArtDirection, type Product } from "@/data/catalog";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  productImageUrl,
  type AdminProduct,
} from "@/lib/supabase-admin";
import {
  DEFAULT_CATEGORIES,
  getStorefrontCategories,
  resolveCategoryForProduct,
} from "@/lib/categories";

import type { ProductGalleryImage } from "@/lib/gallery-types";

import {
  type ProductAvailability,
  resolveAvailabilityStatus,
  getAvailabilityPresentation,
} from "./product-availability";

export type { ProductAvailability };
export { resolveAvailabilityStatus, getAvailabilityPresentation };

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  subcategory: string;
  subcategorySlug: string;
  editorialGroup: string;
  kind: string;
  brand: string | null;
  modelNumber: string | null;
  image: string | null;
  galleryImages: ProductGalleryImage[];
  art: ArtDirection;
  palette: Product["palette"];
  note: string;
  description: string | null;
  specifications: Record<string, string>;
  pricePkr: number | null;
  stockQuantity: number | null;
  availabilityStatus: ProductAvailability;
  source: "static" | "managed";
  reservationProductId: string | null;
  reviewsCount?: number;
  averageRating?: number | null;
};

const staticAssignments: Record<string, { categorySlug: string; subcategorySlug: string }> = {
  "front-load-washer": { categorySlug: "washing-machines", subcategorySlug: "automatic" },
  "pedestal-fan": { categorySlug: "pedestal-fans", subcategorySlug: "standard-pedestal" },
  "kitchen-blender": { categorySlug: "juicer-blenders", subcategorySlug: "3-in-1" },
  "electric-geyser": { categorySlug: "geysers", subcategorySlug: "electric-geyser" },
};

const staticGalleryImages: Record<string, ProductGalleryImage[]> = {
  "front-load-washer": [
    {
      id: "washer-1",
      url: "/products/temp/washer-temp.png",
      altText: "NS Front Load Washing Machine — Front Showcase View",
      isPrimary: true,
      sortOrder: 0,
      mediaType: "image",
    },
    {
      id: "washer-2",
      url: "/products/gallery/washer-angle.jpg",
      altText: "NS Front Load Washing Machine — Angled Perspective with Drum & Glass Door",
      isPrimary: false,
      sortOrder: 1,
      mediaType: "image",
    },
    {
      id: "washer-video",
      url: "/products/gallery/washer-demo.mp4",
      posterUrl: "/products/temp/washer-temp.png",
      altText: "NS Front Load Washing Machine — Product Demonstration Video",
      isPrimary: false,
      sortOrder: 2,
      mediaType: "video",
    },
    {
      id: "washer-3",
      url: "/products/gallery/washer-detail.jpg",
      altText: "NS Front Load Washing Machine — Digital Touch Screen & Rotary Control Dial",
      isPrimary: false,
      sortOrder: 3,
      mediaType: "image",
    },
  ],
  "pedestal-fan": [
    {
      id: "fan-1",
      url: "/products/temp/fan-temp.png",
      altText: "NS High-Velocity Pedestal Fan — Full Body View",
      isPrimary: true,
      sortOrder: 0,
    },
    {
      id: "fan-2",
      url: "/products/gallery/fan-detail.jpg",
      altText: "NS Pedestal Fan — Copper Motor Housing & Aerodynamic Blades",
      isPrimary: false,
      sortOrder: 1,
    },
  ],
  "kitchen-blender": [
    {
      id: "blender-1",
      url: "/products/temp/blender-temp.png",
      altText: "NS 3-in-1 Multi Kitchen Blender — Front Profile",
      isPrimary: true,
      sortOrder: 0,
    },
    {
      id: "blender-2",
      url: "/products/gallery/blender-detail.jpg",
      altText: "NS Kitchen Blender — Titanium 6-Prong Blades & Heavy Glass Goblet",
      isPrimary: false,
      sortOrder: 1,
    },
  ],
  "electric-geyser": [
    {
      id: "geyser-1",
      url: "/products/temp/geyser-temp.png",
      altText: "NS Electric Storage Geyser — Front View",
      isPrimary: true,
      sortOrder: 0,
    },
  ],
};

const staticProductDetails: Record<
  string,
  {
    brand: string;
    modelNumber: string;
    description: string;
    pricePkr: number | null;
    specifications: Record<string, string>;
  }
> = {
  "front-load-washer": {
    brand: "NS Signature",
    modelNumber: "NS-FL1000",
    description:
      "High-performance front-load washing machine engineered for superior fabric care, quiet operation, and deep dirt extraction. Features an advanced inverter motor, specialized fabric cycles, high-speed spin extraction, and a high-durability stainless steel drum.",
    pricePkr: 115000,
    specifications: {
      "Wash Capacity": "10.0 kg",
      "Spin Speed": "1400 RPM High Efficiency",
      "Motor Type": "Brushless Inverter Direct Drive",
      "Drum Construction": "Embossed Stainless Steel Active Drum",
      "Control Interface": "Digital Touch LED with Rotary Selection",
      "Number of Cycles": "14 Specialized Programs",
      "Energy Rating": "A+++ Inverter Efficiency",
      "Operating Voltage": "220-240V ~ 50Hz",
    },
  },
  "pedestal-fan": {
    brand: "NS Cooling",
    modelNumber: "PF-24D",
    description:
      "Heavy-duty pedestal stand fan designed for optimal air circulation in large rooms, living halls, and showroom spaces. Built with 100% pure copper motor windings, reinforced protective grill, and low-vibration weighted stand.",
    pricePkr: 18500,
    specifications: {
      "Sweep Size": "24 Inch (600 mm)",
      "Motor Specification": "100% Pure Copper Wire Winding",
      "Speed Regulation": "3-Speed Selection",
      "Blade Design": "3 Aerodynamic Balanced Aluminum Blades",
      "Oscillation Range": "90° Wide Smooth Sweep",
      "Height Adjustable": "Yes (Telescopic Heavy Base)",
      "Power Consumption": "125 Watts",
      "Voltage": "220V ~ 50Hz",
    },
  },
  "kitchen-blender": {
    brand: "NS Kitchen",
    modelNumber: "KB-850",
    description:
      "Multipurpose kitchen blender and spice grinder equipped with hardened titanium blades and variable speed control. Effortlessly crushes ice, extracts fresh fruit juice, and finely grinds tough whole spices.",
    pricePkr: 14200,
    specifications: {
      "Motor Rating": "850 Watts Heavy Duty",
      "Main Goblet Capacity": "1.5 Litres Thermal Glass",
      "Blade Assembly": "6-Prong Titanium Steel Blade",
      "Grinder Attachment": "Stainless Steel Dry Spice Mill",
      "Speed Settings": "2 Speeds + Pulse Function",
      "Safety Mechanism": "Interlock Auto Shut-Off",
      "Base Construction": "Non-Slip Brushed Chrome Base",
    },
  },
  "electric-geyser": {
    brand: "NS Home",
    modelNumber: "EG-35L",
    description:
      "Reliable electric storage water heater engineered for fast heating and all-day thermal heat retention. Features safety pressure release valve, high-density insulation, and corrosion-resistant enamel coating.",
    pricePkr: 28000,
    specifications: {
      "Storage Volume": "35 Litres Capacity",
      "Heating Element": "2000W Incoloy Heavy Duty",
      "Tank Material": "Glass-Lined Enamel Anti-Corrosion",
      "Thermal Insulation": "High-Density Eco PUF Foam",
      "Thermostat": "Dual Safety Auto Cut-Off",
      "Working Pressure": "Up to 8 Bar Safety Limit",
      "Mounting": "Vertical Wall Mount",
    },
  },
};

const fallbackArt: ArtDirection = { scale: 1, x: 0, y: 0 };
const fallbackPalette: Product["palette"] = {
  base: "#d9d6d0",
  panel: "#20282c",
  ink: "#f3f3ef",
  accent: "#b8ca72",
};

function fromStatic(product: Product): StorefrontProduct {
  const assignment = staticAssignments[product.slug];
  const cat = resolveCategoryForProduct(
    assignment?.categorySlug ?? product.category,
    assignment?.subcategorySlug ?? product.kind,
    DEFAULT_CATEGORIES,
  );

  const staticDetails = staticProductDetails[product.slug];
  const gallery = staticGalleryImages[product.slug] ?? [
    {
      id: `static-img-${product.slug}`,
      url: product.image,
      altText: product.name,
      isPrimary: true,
      sortOrder: 0,
    },
  ];

  return {
    id: `static:${product.slug}`,
    slug: product.slug,
    name: product.name,
    category: cat.name,
    categorySlug: cat.slug,
    subcategory: product.kind,
    subcategorySlug: assignment?.subcategorySlug ?? product.slug,
    editorialGroup: cat.editorial_group,
    kind: cat.name,
    brand: staticDetails?.brand ?? null,
    modelNumber: staticDetails?.modelNumber ?? null,
    image: product.image,
    galleryImages: gallery,
    art: product.art,
    palette: product.palette,
    note: product.note,
    description: staticDetails?.description ?? null,
    specifications: staticDetails?.specifications ?? {},
    pricePkr: staticDetails?.pricePkr ?? null,
    stockQuantity: null,
    availabilityStatus: "not_confirmed",
    source: "static",
    reservationProductId: null,
  };
}

function fromManaged(
  product: AdminProduct,
  allCategories = DEFAULT_CATEGORIES,
  dbGalleryImages?: ProductGalleryImage[],
): StorefrontProduct {
  const cat = resolveCategoryForProduct(product.category_slug, product.subcategory_slug, allCategories);
  const sub = cat.subcategories.find((s) => s.slug === product.subcategory_slug);

  const brand =
    (product as { brand?: string | null }).brand ||
    product.specifications?.Brand ||
    product.specifications?.brand ||
    null;

  const modelNumber =
    (product as { model_number?: string | null }).model_number ||
    product.specifications?.["Model Number"] ||
    product.specifications?.Model ||
    product.specifications?.model ||
    null;

  const primaryUrl = productImageUrl(product.image_path);

  // Construct gallery images: Use database gallery if present, else synthesize from image_path
  let gallery: ProductGalleryImage[] = [];
  if (dbGalleryImages && dbGalleryImages.length > 0) {
    gallery = dbGalleryImages;
  } else if (primaryUrl) {
    gallery = [
      {
        id: `img-${product.id}`,
        url: primaryUrl,
        storagePath: product.image_path ?? undefined,
        altText: product.name,
        isPrimary: true,
        sortOrder: 0,
      },
    ];
  }

  // Determine cover image: strictly an image, never a video (preserves catalog card presentation)
  const primaryImage =
    gallery.find((g) => g.isPrimary && g.mediaType !== "video") ||
    gallery.find((g) => g.mediaType !== "video") ||
    null;
  const coverImage = primaryImage?.url || primaryUrl;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: cat.name,
    categorySlug: cat.slug,
    subcategory: sub?.name ?? product.subcategory_slug ?? cat.name,
    subcategorySlug: product.subcategory_slug ?? cat.slug,
    editorialGroup: cat.editorial_group,
    kind: cat.name,
    brand,
    modelNumber,
    image: coverImage,
    galleryImages: gallery,
    art: fallbackArt,
    palette: fallbackPalette,
    note: "Published product details are managed by NS Home Appliances.",
    description: product.description,
    specifications: product.specifications ?? {},
    pricePkr: product.price_pkr,
    stockQuantity: product.stock_quantity ?? null,
    availabilityStatus: resolveAvailabilityStatus(product),
    source: "managed",
    reservationProductId: product.id,
  };
}

async function getManagedProducts(): Promise<AdminProduct[]> {
  const config = getSupabaseConfig();
  if (!config) return [];

  const baseSelect =
    "id,slug,name,category_slug,subcategory_slug,description,specifications,price_pkr,stock_quantity,status,image_path,created_at,updated_at";
  const enhancedSelect = `${baseSelect},availability_status`;

  try {
    let response = await fetch(
      `${config.url}/rest/v1/products?${new URLSearchParams({
        select: enhancedSelect,
        status: "eq.active",
        order: "updated_at.desc",
      })}`,
      {
        headers: { apikey: config.key },
        next: { revalidate: 60, tags: ["public-products"] },
      },
    );

    // If Postgres doesn't have the column yet, fallback to baseSelect
    if (!response.ok) {
      response = await fetch(
        `${config.url}/rest/v1/products?${new URLSearchParams({
          select: baseSelect,
          status: "eq.active",
          order: "updated_at.desc",
        })}`,
        {
          headers: { apikey: config.key },
          next: { revalidate: 60, tags: ["public-products"] },
        },
      );
    }

    if (!response.ok) return [];
    return (await response.json()) as AdminProduct[];
  } catch {
    return [];
  }
}

import { getApprovedReviews } from "@/lib/reviews";

async function getManagedProductGallery(productId: string): Promise<ProductGalleryImage[]> {
  const config = getSupabaseConfig();
  if (!config) return [];
  try {
    const query = new URLSearchParams({
      select: "id,storage_path,alt_text,sort_order,is_primary,media_type",
      product_id: `eq.${productId}`,
      order: "sort_order.asc",
    });
    const res = await fetch(`${config.url}/rest/v1/product_images?${query}`, {
      headers: { apikey: config.key },
      next: { revalidate: 60, tags: [`product-images-${productId}`] },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      id: string;
      storage_path: string;
      alt_text: string | null;
      sort_order: number;
      is_primary: boolean;
      media_type?: string | null;
    }>;
    return rows
      .map((r) => {
        const isVideo =
          r.media_type === "video" || /\.(mp4|webm)$/i.test(r.storage_path);
        return {
          id: r.id,
          url: productImageUrl(r.storage_path) || "",
          storagePath: r.storage_path,
          altText: r.alt_text || (isVideo ? "Product demonstration video" : "Product showroom photo"),
          isPrimary: isVideo ? false : r.is_primary,
          sortOrder: r.sort_order,
          mediaType: isVideo ? ("video" as const) : ("image" as const),
        };
      })
      .filter((img) => Boolean(img.url));
  } catch {
    return [];
  }
}

async function getManagedProductGalleries(
  productIds: string[],
): Promise<Record<string, ProductGalleryImage[]>> {
  if (productIds.length === 0) return {};
  const config = getSupabaseConfig();
  if (!config) return {};
  try {
    const query = new URLSearchParams({
      select: "id,product_id,storage_path,alt_text,sort_order,is_primary,media_type",
      product_id: `in.(${productIds.join(",")})`,
      order: "sort_order.asc",
    });
    const res = await fetch(`${config.url}/rest/v1/product_images?${query}`, {
      headers: { apikey: config.key },
      next: { revalidate: 60, tags: ["product-images-all"] },
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{
      id: string;
      product_id: string;
      storage_path: string;
      alt_text: string | null;
      sort_order: number;
      is_primary: boolean;
      media_type?: string | null;
    }>;
    const map: Record<string, ProductGalleryImage[]> = {};
    for (const r of rows) {
      const isVideo =
        r.media_type === "video" || /\.(mp4|webm)$/i.test(r.storage_path);
      const img: ProductGalleryImage = {
        id: r.id,
        url: productImageUrl(r.storage_path) || "",
        storagePath: r.storage_path,
        altText:
          r.alt_text ||
          (isVideo ? "Product demonstration video" : "Product showroom photo"),
        isPrimary: isVideo ? false : r.is_primary,
        sortOrder: r.sort_order,
        mediaType: isVideo ? ("video" as const) : ("image" as const),
      };
      if (img.url) {
        if (!map[r.product_id]) map[r.product_id] = [];
        map[r.product_id].push(img);
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Public records are deliberately additive. A verified active record with the
 * same slug replaces its placeholder presentation, avoiding duplicate routes.
 */
export async function getStorefrontProducts(): Promise<StorefrontProduct[]> {
  const categories = await getStorefrontCategories();
  const managed = await getManagedProducts();

  // Once Supabase is configured, it owns public availability. In particular,
  // never fall back to a local fixture for an inactive or deleted live record.
  // Fixtures remain useful only for an unconfigured local preview.
  if (isSupabaseConfigured()) {
    const productIds = managed.map((p) => p.id).filter(Boolean);
    const galleryMap = await getManagedProductGalleries(productIds);
    return managed.map((product) =>
      fromManaged(product, categories, galleryMap[product.id]),
    );
  }

  return products.map(fromStatic);
}

export async function getStorefrontProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  const all = await getStorefrontProducts();
  let found = all.find((product) => product.slug === slug);
  if (!found) {
    const staticMatch = products.find((product) => product.slug === slug);
    if (staticMatch) {
      found = fromStatic(staticMatch);
    }
  }
  if (!found) return null;

  // If it's a managed product, enrich with multi-image gallery from database
  if (found.source === "managed" && found.id) {
    const dbGallery = await getManagedProductGallery(found.id);
    if (dbGallery.length > 0) {
      found.galleryImages = dbGallery;
      const primary = dbGallery.find((g) => g.isPrimary) || dbGallery[0];
      if (primary) found.image = primary.url;
    }
  }

  // Enrich with approved reviews
  const reviews = await getApprovedReviews(found.id);
  found.reviewsCount = reviews.length;
  found.averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return found;
}

export async function getStorefrontProductById(id: string) {
  const all = await getStorefrontProducts();
  return all.find((product) => (product.id === id || product.reservationProductId === id) && product.source === "managed") ?? null;
}
