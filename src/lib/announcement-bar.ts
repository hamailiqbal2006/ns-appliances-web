import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseConfig } from "@/lib/supabase-admin";

export type AnnouncementTheme =
  | "charcoal-graphite"
  | "deep-navy-teal"
  | "soft-black-blue"
  | "dark-olive-charcoal"
  | "warm-beige-stone"
  | "ruby-red"
  | "crimson-sunset"
  | "golden-yellow"
  | "sunset-orange"
  | "rose-pink"
  | "royal-purple"
  | "electric-blue"
  | "ocean-cyan"
  | "emerald-green"
  | "lime-energy"
  | "berry-fusion"
  | "festival-gradient";

export type AnnouncementSeparator = "dot" | "diamond" | "star" | "slash";

export type AnnouncementSpeed = "slow" | "normal" | "fast";

export type AnnouncementMessage = {
  id: string;
  message: string;
  isActive: boolean;
  sortOrder: number;
};

export type AnnouncementBar = {
  enabled: boolean;
  theme: AnnouncementTheme;
  separator: AnnouncementSeparator;
  speed: AnnouncementSpeed;
  messages: AnnouncementMessage[];
};

export type AdminAnnouncementBar = AnnouncementBar & {
  isReady: boolean;
  hasCustomizationColumns: boolean;
};

const VALID_THEMES: ReadonlySet<string> = new Set<AnnouncementTheme>([
  "charcoal-graphite",
  "deep-navy-teal",
  "soft-black-blue",
  "dark-olive-charcoal",
  "warm-beige-stone",
  "ruby-red",
  "crimson-sunset",
  "golden-yellow",
  "sunset-orange",
  "rose-pink",
  "royal-purple",
  "electric-blue",
  "ocean-cyan",
  "emerald-green",
  "lime-energy",
  "berry-fusion",
  "festival-gradient",
]);

export function sanitizeTheme(val: unknown): AnnouncementTheme {
  if (typeof val === "string" && VALID_THEMES.has(val)) {
    return val as AnnouncementTheme;
  }
  return "charcoal-graphite";
}

export function sanitizeSeparator(val: unknown): AnnouncementSeparator {
  if (val === "diamond" || val === "star" || val === "slash") {
    return val;
  }
  return "dot";
}

export function sanitizeSpeed(val: unknown): AnnouncementSpeed {
  if (val === "slow" || val === "fast") {
    return val;
  }
  return "normal";
}

type AnnouncementMessageRow = {
  id: string;
  message: string;
  is_active: boolean;
  sort_order: number;
};

type AnnouncementSettingsRow = {
  enabled?: boolean;
  theme?: string;
  separator?: string;
  speed?: string;
};

function hydrate(rows: AnnouncementMessageRow[]): AnnouncementMessage[] {
  return rows
    .filter((row) => typeof row.message === "string" && row.message.length > 0 && row.message.length <= 120)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({ id: row.id, message: row.message, isActive: row.is_active, sortOrder: row.sort_order }));
}

export async function getAnnouncementBar(): Promise<AnnouncementBar> {
  "use cache";
  cacheLife("minutes");
  cacheTag("announcement-bar");
  const config = getSupabaseConfig();
  if (!config) {
    return {
      enabled: false,
      theme: "charcoal-graphite",
      separator: "dot",
      speed: "normal",
      messages: [],
    };
  }

  try {
    const messagesPromise = fetch(
      `${config.url}/rest/v1/announcement_bar_messages?select=id,message,is_active,sort_order&is_active=eq.true&order=sort_order.asc`,
      { headers: { apikey: config.key } },
    );

    let settingsResponse = await fetch(
      `${config.url}/rest/v1/announcement_bar_settings?select=enabled,theme,separator,speed&singleton=eq.true`,
      { headers: { apikey: config.key } },
    );

    if (!settingsResponse.ok) {
      settingsResponse = await fetch(
        `${config.url}/rest/v1/announcement_bar_settings?select=enabled&singleton=eq.true`,
        { headers: { apikey: config.key } },
      );
    }

    const messagesResponse = await messagesPromise;
    if (!settingsResponse.ok || !messagesResponse.ok) {
      return {
        enabled: false,
        theme: "charcoal-graphite",
        separator: "dot",
        speed: "normal",
        messages: [],
      };
    }

    const settings = (await settingsResponse.json()) as AnnouncementSettingsRow[];
    const first = settings[0];
    const messages = hydrate((await messagesResponse.json()) as AnnouncementMessageRow[]);

    return {
      enabled: first?.enabled === true,
      theme: sanitizeTheme(first?.theme),
      separator: sanitizeSeparator(first?.separator),
      speed: sanitizeSpeed(first?.speed),
      messages,
    };
  } catch {
    return {
      enabled: false,
      theme: "charcoal-graphite",
      separator: "dot",
      speed: "normal",
      messages: [],
    };
  }
}

export async function getAdminAnnouncementBar(accessToken: string | null): Promise<AdminAnnouncementBar> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) {
    return {
      enabled: false,
      theme: "charcoal-graphite",
      separator: "dot",
      speed: "normal",
      messages: [],
      isReady: false,
      hasCustomizationColumns: false,
    };
  }

  try {
    const headers = { apikey: config.key, Authorization: `Bearer ${accessToken}` };
    const messagesPromise = fetch(
      `${config.url}/rest/v1/announcement_bar_messages?select=id,message,is_active,sort_order&order=sort_order.asc`,
      { headers, cache: "no-store" },
    );

    let hasCustomizationColumns = true;
    let settingsResponse = await fetch(
      `${config.url}/rest/v1/announcement_bar_settings?select=enabled,theme,separator,speed&singleton=eq.true`,
      { headers, cache: "no-store" },
    );

    if (!settingsResponse.ok) {
      hasCustomizationColumns = false;
      settingsResponse = await fetch(
        `${config.url}/rest/v1/announcement_bar_settings?select=enabled&singleton=eq.true`,
        { headers, cache: "no-store" },
      );
    }

    const messagesResponse = await messagesPromise;
    if (!settingsResponse.ok || !messagesResponse.ok) {
      return {
        enabled: false,
        theme: "charcoal-graphite",
        separator: "dot",
        speed: "normal",
        messages: [],
        isReady: false,
        hasCustomizationColumns: false,
      };
    }

    const settings = (await settingsResponse.json()) as AnnouncementSettingsRow[];
    const first = settings[0];
    const messages = hydrate((await messagesResponse.json()) as AnnouncementMessageRow[]);

    return {
      enabled: first?.enabled === true,
      theme: sanitizeTheme(first?.theme),
      separator: sanitizeSeparator(first?.separator),
      speed: sanitizeSpeed(first?.speed),
      messages,
      isReady: Boolean(first),
      hasCustomizationColumns,
    };
  } catch {
    return {
      enabled: false,
      theme: "charcoal-graphite",
      separator: "dot",
      speed: "normal",
      messages: [],
      isReady: false,
      hasCustomizationColumns: false,
    };
  }
}
