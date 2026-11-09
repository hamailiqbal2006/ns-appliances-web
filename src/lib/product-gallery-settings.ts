import fs from "node:fs";
import path from "node:path";

export type ProductGallerySettings = {
  autoplay: boolean;
  intervalSeconds: 3 | 5 | 10;
};

export const DEFAULT_GALLERY_SETTINGS: ProductGallerySettings = {
  autoplay: false,
  intervalSeconds: 5,
};

const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "product-gallery-settings.json");

function readFallbackSettings(): Record<string, ProductGallerySettings> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Graceful fallback
  }
  return {};
}

function writeFallbackSettings(data: Record<string, ProductGallerySettings>) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[product-gallery-settings] Could not write fallback settings file:", err);
  }
}

export function resolveProductGallerySettings(
  productIdOrSlug: string,
  dbAutoplay?: boolean | null,
  dbInterval?: number | null,
  secondaryKey?: string,
): ProductGallerySettings {
  if (typeof dbAutoplay === "boolean" && dbInterval) {
    const validInterval =
      dbInterval === 3 || dbInterval === 5 || dbInterval === 10 ? dbInterval : 5;
    return { autoplay: dbAutoplay, intervalSeconds: validInterval };
  }

  const fallbackMap = readFallbackSettings();
  const saved =
    fallbackMap[productIdOrSlug] ||
    (secondaryKey ? fallbackMap[secondaryKey] : undefined);
  if (saved) {
    return {
      autoplay: Boolean(saved.autoplay),
      intervalSeconds:
        saved.intervalSeconds === 3 ||
        saved.intervalSeconds === 5 ||
        saved.intervalSeconds === 10
          ? saved.intervalSeconds
          : 5,
    };
  }

  return DEFAULT_GALLERY_SETTINGS;
}

export function saveProductGallerySettingsFallback(
  productIdOrSlug: string,
  autoplay: boolean,
  intervalSeconds: number,
  secondaryKey?: string,
) {
  const fallbackMap = readFallbackSettings();
  const validInterval =
    intervalSeconds === 3 || intervalSeconds === 5 || intervalSeconds === 10
      ? (intervalSeconds as 3 | 5 | 10)
      : 5;
  const config = {
    autoplay,
    intervalSeconds: validInterval,
  };
  fallbackMap[productIdOrSlug] = config;
  if (secondaryKey && secondaryKey !== productIdOrSlug) {
    fallbackMap[secondaryKey] = config;
  }
  writeFallbackSettings(fallbackMap);
}
