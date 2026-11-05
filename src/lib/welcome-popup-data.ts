import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_WELCOME_POPUP_CONFIG, type WelcomePopupConfig } from "@/lib/welcome-popup";
import { getSupabaseConfig } from "@/lib/supabase-admin";

type WelcomePopupRow = {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  description: string;
  offer_text: string | null;
  button_label: string;
  image_path: string | null;
  image_alt: string;
  display_delay_seconds: number;
};

export type WelcomePopupAdminConfig = WelcomePopupConfig & {
  imagePath: string | null;
  isReady: boolean;
};

function mediaUrl(path: string | null) {
  return path ? `/api/welcome-popup-media/${path.split("/").map(encodeURIComponent).join("/")}` : undefined;
}

function hydrate(row: WelcomePopupRow, isReady: boolean): WelcomePopupAdminConfig {
  return {
    enabled: row.enabled,
    eyebrow: row.eyebrow,
    headline: row.headline,
    description: row.description,
    offerText: row.offer_text,
    buttonLabel: row.button_label,
    imageSrc: mediaUrl(row.image_path),
    imagePath: row.image_path,
    imageAlt: row.image_alt,
    displayDelaySeconds: row.display_delay_seconds,
    isReady,
  };
}

export function defaultWelcomePopupAdminConfig(): WelcomePopupAdminConfig {
  return { ...DEFAULT_WELCOME_POPUP_CONFIG, imagePath: null, isReady: false };
}

/** Public settings are the only welcome-popup records readable without an admin session. */
export async function getWelcomePopupConfig(): Promise<WelcomePopupConfig> {
  "use cache";
  cacheLife("minutes");
  cacheTag("welcome-popup");
  const config = getSupabaseConfig();
  if (!config) return DEFAULT_WELCOME_POPUP_CONFIG;
  try {
    const query = new URLSearchParams({
      select: "enabled,eyebrow,headline,description,offer_text,button_label,image_path,image_alt,display_delay_seconds",
      singleton: "eq.true",
      limit: "1",
    });
    const response = await fetch(`${config.url}/rest/v1/welcome_popup_settings?${query}`, {
      headers: { apikey: config.key },
    });
    if (!response.ok) return DEFAULT_WELCOME_POPUP_CONFIG;
    const row = (await response.json() as WelcomePopupRow[])[0];
    return row ? hydrate(row, true) : DEFAULT_WELCOME_POPUP_CONFIG;
  } catch {
    return DEFAULT_WELCOME_POPUP_CONFIG;
  }
}

export async function getAdminWelcomePopupConfig(accessToken: string | null): Promise<WelcomePopupAdminConfig> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) return defaultWelcomePopupAdminConfig();
  try {
    const query = new URLSearchParams({
      select: "enabled,eyebrow,headline,description,offer_text,button_label,image_path,image_alt,display_delay_seconds",
      singleton: "eq.true",
      limit: "1",
    });
    const response = await fetch(`${config.url}/rest/v1/welcome_popup_settings?${query}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return defaultWelcomePopupAdminConfig();
    const row = (await response.json() as WelcomePopupRow[])[0];
    return row ? hydrate(row, true) : defaultWelcomePopupAdminConfig();
  } catch {
    return defaultWelcomePopupAdminConfig();
  }
}
