import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseConfig } from "@/lib/supabase-admin";

export type HomepageSliderSettings = {
  bannerCount: number;
  intervalSeconds: number;
};

export const DEFAULT_SLIDER_SETTINGS: HomepageSliderSettings = {
  bannerCount: 3,
  intervalSeconds: 5,
};

export type HomepageBanner = {
  id: string;
  className: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  imagePath: string | null;
  imageUrl: string | null;
  mobileImagePath: string | null;
  mobileImageUrl: string | null;
  sortOrder: number;
  isEnabled: boolean;
};

type HomepageBannerRow = {
  slot_key: string;
  sort_order: number;
  image_path: string | null;
  mobile_image_path?: string | null;
  is_enabled?: boolean | null;
};

/**
 * These are the three approved CSS/GSAP visual treatments. They deliberately
 * remain code-owned so the banner editor cannot introduce a fourth slide or a
 * new, unreviewed layout. Supabase owns only their order and optional artwork.
 */
const approvedSlots: Omit<
  HomepageBanner,
  "imagePath" | "imageUrl" | "mobileImagePath" | "mobileImageUrl" | "sortOrder" | "isEnabled"
>[] = [
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
    mobileImagePath: null,
    mobileImageUrl: null,
    sortOrder,
    isEnabled: true,
  }));
}

function isCompleteConfiguration(rows: HomepageBannerRow[]) {
  if (rows.length < 1) return false;
  return (
    rows.every(
      (row) =>
        typeof row.slot_key === "string" &&
        row.slot_key.length > 0 &&
        Number.isInteger(row.sort_order) &&
        row.sort_order >= 0,
    ) &&
    new Set(rows.map((row) => row.slot_key)).size === rows.length &&
    new Set(rows.map((row) => row.sort_order)).size === rows.length
  );
}

function hydrate(rows: HomepageBannerRow[]): HomepageBanner[] {
  if (!isCompleteConfiguration(rows)) return defaultHomepageBanners();
  const slots = new Map(approvedSlots.map((slot) => [slot.id, slot]));
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row, idx) => {
      const slot = slots.get(row.slot_key) ?? {
        id: row.slot_key,
        className: `hero-ambient-slide-${(idx % 3) + 1}`,
        palette: {
          primary: "rgba(142, 178, 126, 0.32)",
          secondary: "rgba(68, 138, 125, 0.22)",
          accent: "rgba(225, 238, 200, 0.28)",
        },
      };
      const mobilePath = row.mobile_image_path ?? null;
      return {
        ...slot,
        imagePath: row.image_path,
        imageUrl: mediaUrl(row.image_path),
        mobileImagePath: mobilePath,
        mobileImageUrl: mediaUrl(mobilePath),
        sortOrder: row.sort_order,
        isEnabled: row.is_enabled ?? true,
      };
    });
}

/** Public homepage slider settings source. Falls back to 3 banners, 5s interval if unconfigured. */
export async function getHomepageSliderSettings(): Promise<HomepageSliderSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag("homepage-banner-settings");
  const config = getSupabaseConfig();
  if (!config) return DEFAULT_SLIDER_SETTINGS;

  try {
    const response = await fetch(
      `${config.url}/rest/v1/homepage_banner_settings?select=banner_count,interval_seconds&singleton=eq.true&limit=1`,
      { headers: { apikey: config.key } },
    );
    if (!response.ok) return DEFAULT_SLIDER_SETTINGS;
    const rows = (await response.json()) as Array<{ banner_count: number; interval_seconds: number }>;
    if (!rows || rows.length === 0) return DEFAULT_SLIDER_SETTINGS;
    return {
      bannerCount: Math.max(1, Math.min(Number(rows[0].banner_count) || 3, 10)),
      intervalSeconds: Math.max(2, Math.min(Number(rows[0].interval_seconds) || 5, 30)),
    };
  } catch {
    return DEFAULT_SLIDER_SETTINGS;
  }
}

/** Admin source for slider settings with an explicit readiness flag. */
export async function getAdminHomepageSliderSettings(accessToken: string | null): Promise<{
  settings: HomepageSliderSettings;
  isSettingsReady: boolean;
}> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) {
    return { settings: DEFAULT_SLIDER_SETTINGS, isSettingsReady: false };
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/homepage_banner_settings?select=banner_count,interval_seconds&singleton=eq.true&limit=1`,
      {
        headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return { settings: DEFAULT_SLIDER_SETTINGS, isSettingsReady: false };
    }
    const rows = (await response.json()) as Array<{ banner_count: number; interval_seconds: number }>;
    if (!rows || rows.length === 0) {
      return { settings: DEFAULT_SLIDER_SETTINGS, isSettingsReady: true };
    }
    return {
      settings: {
        bannerCount: Math.max(1, Math.min(Number(rows[0].banner_count) || 3, 10)),
        intervalSeconds: Math.max(2, Math.min(Number(rows[0].interval_seconds) || 5, 30)),
      },
      isSettingsReady: true,
    };
  } catch {
    return { settings: DEFAULT_SLIDER_SETTINGS, isSettingsReady: false };
  }
}

/** Public homepage source. Missing or invalid configuration keeps the approved hero intact. */
export async function getHomepageBanners(): Promise<HomepageBanner[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("homepage-banners");
  const config = getSupabaseConfig();
  if (!config) return defaultHomepageBanners();

  try {
    let query = new URLSearchParams({
      select: "slot_key,sort_order,image_path,mobile_image_path,is_enabled",
      order: "sort_order.asc",
    });
    let response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
      headers: { apikey: config.key },
    });
    // Resilient fallback if is_enabled column is not yet applied
    if (!response.ok && response.status === 400) {
      query = new URLSearchParams({
        select: "slot_key,sort_order,image_path,mobile_image_path",
        order: "sort_order.asc",
      });
      response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
        headers: { apikey: config.key },
      });
    }
    // Resilient fallback if mobile_image_path column is not yet applied
    if (!response.ok && response.status === 400) {
      query = new URLSearchParams({
        select: "slot_key,sort_order,image_path",
        order: "sort_order.asc",
      });
      response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
        headers: { apikey: config.key },
      });
    }
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
  supportsMobileImage: boolean;
  supportsEnabledToggle: boolean;
}> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) {
    return { banners: defaultHomepageBanners(), isReady: false, supportsMobileImage: false, supportsEnabledToggle: false };
  }

  try {
    let supportsMobileImage = true;
    let supportsEnabledToggle = true;
    let query = new URLSearchParams({
      select: "slot_key,sort_order,image_path,mobile_image_path,is_enabled",
      order: "sort_order.asc",
    });
    let response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok && response.status === 400) {
      supportsEnabledToggle = false;
      query = new URLSearchParams({
        select: "slot_key,sort_order,image_path,mobile_image_path",
        order: "sort_order.asc",
      });
      response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
        headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    }
    if (!response.ok && response.status === 400) {
      supportsMobileImage = false;
      query = new URLSearchParams({
        select: "slot_key,sort_order,image_path",
        order: "sort_order.asc",
      });
      response = await fetch(`${config.url}/rest/v1/homepage_banners?${query}`, {
        headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    }
    if (!response.ok) {
      return { banners: defaultHomepageBanners(), isReady: false, supportsMobileImage: false, supportsEnabledToggle: false };
    }
    const rows = (await response.json()) as HomepageBannerRow[];
    return {
      banners: hydrate(rows),
      isReady: isCompleteConfiguration(rows),
      supportsMobileImage,
      supportsEnabledToggle,
    };
  } catch {
    return { banners: defaultHomepageBanners(), isReady: false, supportsMobileImage: false, supportsEnabledToggle: false };
  }
}
