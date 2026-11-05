import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseConfig } from "@/lib/supabase-admin";

export type HomepageBanner = {
  id: "brand" | "climate" | "utility";
  className: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  imagePath: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

type HomepageBannerRow = {
  slot_key: HomepageBanner["id"];
  sort_order: number;
  image_path: string | null;
};

/**
 * These are the three approved CSS/GSAP visual treatments. They deliberately
 * remain code-owned so the banner editor cannot introduce a fourth slide or a
 * new, unreviewed layout. Supabase owns only their order and optional artwork.
 */
const approvedSlots: Omit<HomepageBanner, "imagePath" | "imageUrl" | "sortOrder">[] = [
  {
    id: "brand",
    className: "hero-ambient-slide-1",
    palette: {
      primary: "rgba(142, 178, 126, 0.32)",
      secondary: "rgba(68, 138, 125, 0.22)",
      accent: "rgba(225, 238, 200, 0.28)",
    },
  },
  {
    id: "climate",
    className: "hero-ambient-slide-2",
    palette: {
      primary: "rgba(110, 185, 205, 0.30)",
      secondary: "rgba(42, 115, 130, 0.22)",
      accent: "rgba(195, 235, 245, 0.26)",
    },
  },
  {
    id: "utility",
    className: "hero-ambient-slide-3",
    palette: {
      primary: "rgba(205, 165, 110, 0.28)",
      secondary: "rgba(125, 95, 60, 0.20)",
      accent: "rgba(245, 225, 185, 0.24)",
    },
  },
];

function mediaUrl(path: string | null) {
  if (!path) return null;
  return `/api/banner-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function defaultHomepageBanners(): HomepageBanner[] {
  return approvedSlots.map((slot, sortOrder) => ({
    ...slot,
    imagePath: null,
    imageUrl: null,
    sortOrder,
  }));
}

function isCompleteConfiguration(rows: HomepageBannerRow[]) {
  if (rows.length !== approvedSlots.length) return false;
  const expected = new Set(approvedSlots.map((slot) => slot.id));
  return (
    rows.every(
      (row) =>
        expected.has(row.slot_key) &&
        Number.isInteger(row.sort_order) &&
        row.sort_order >= 0 &&
        row.sort_order < approvedSlots.length,
    ) &&
    new Set(rows.map((row) => row.slot_key)).size === approvedSlots.length &&
    new Set(rows.map((row) => row.sort_order)).size === approvedSlots.length
  );
}

function hydrate(rows: HomepageBannerRow[]): HomepageBanner[] {
  if (!isCompleteConfiguration(rows)) return defaultHomepageBanners();
  const slots = new Map(approvedSlots.map((slot) => [slot.id, slot]));
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const slot = slots.get(row.slot_key)!;
      return {
        ...slot,
        imagePath: row.image_path,
        imageUrl: mediaUrl(row.image_path),
        sortOrder: row.sort_order,
      };
    });
}

/** Public homepage source. Missing or invalid configuration keeps the approved hero intact. */
export async function getHomepageBanners(): Promise<HomepageBanner[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("homepage-banners");
  const config = getSupabaseConfig();
  if (!config) return defaultHomepageBanners();

  try {
    const query = new URLSearchParams({
      select: "slot_key,sort_order,image_path",
      order: "sort_order.asc",
    });
    const response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
      headers: { apikey: config.key },
    });
    if (!response.ok) return defaultHomepageBanners();
    return hydrate((await response.json()) as HomepageBannerRow[]);
  } catch {
    return defaultHomepageBanners();
  }
}

/** Admin source with an explicit readiness flag so writes can be safely blocked. */
export async function getAdminHomepageBanners(accessToken: string | null): Promise<{
  banners: HomepageBanner[];
  isReady: boolean;
}> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) return { banners: defaultHomepageBanners(), isReady: false };

  try {
    const query = new URLSearchParams({
      select: "slot_key,sort_order,image_path",
      order: "sort_order.asc",
    });
    const response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return { banners: defaultHomepageBanners(), isReady: false };
    const rows = (await response.json()) as HomepageBannerRow[];
    return { banners: hydrate(rows), isReady: isCompleteConfiguration(rows) };
  } catch {
    return { banners: defaultHomepageBanners(), isReady: false };
  }
}
