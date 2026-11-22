import "server-only";

import { getSupabaseConfig } from "./supabase-admin";
import { getStorefrontCategories } from "./categories";
import {
  getDefaultCategoryShowcase,
  mergeShowcaseRows,
  bindShowcaseCategories,
  type CategoryShowcaseItem,
  type CategoryShowcaseRow,
} from "./category-showcase";

/** Public homepage source for category showcase configuration */
export async function getHomepageCategoryShowcase(): Promise<CategoryShowcaseItem[]> {
  const config = getSupabaseConfig();
  const categories = await getStorefrontCategories();
  const bind = (items: CategoryShowcaseItem[]) => bindShowcaseCategories(items, categories, true);
  if (!config) return bind(getDefaultCategoryShowcase());

  try {
    const query = new URLSearchParams({
      select: "*",
      order: "sort_order.asc",
    });

    const response = await fetch(`${config.url}/rest/v1/homepage_category_showcase?${query}`, {
      headers: { apikey: config.key },
      next: { revalidate: 300, tags: ["category-showcase", "categories"] },
    });

    if (!response.ok) return bind(getDefaultCategoryShowcase());
    const rows = (await response.json()) as CategoryShowcaseRow[];
    return bind(mergeShowcaseRows(rows));
  } catch {
    return bind(getDefaultCategoryShowcase());
  }
}

/** Admin source for category showcase configuration */
export async function getAdminCategoryShowcase(accessToken: string | null): Promise<{
  items: CategoryShowcaseItem[];
  isDatabaseReady: boolean;
}> {
  const categories = await getStorefrontCategories();
  const bind = (items: CategoryShowcaseItem[]) => bindShowcaseCategories(items, categories);
  const defaults = bind(getDefaultCategoryShowcase());
  const config = getSupabaseConfig();
  if (!config || !accessToken) {
    return { items: defaults, isDatabaseReady: false };
  }

  try {
    const query = new URLSearchParams({
      select: "*",
      order: "sort_order.asc",
    });

    const response = await fetch(`${config.url}/rest/v1/homepage_category_showcase?${query}`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const rows = (await response.json()) as CategoryShowcaseRow[];
      return { items: bind(mergeShowcaseRows(rows)), isDatabaseReady: true };
    }

    // The showcase is intentionally public-readable. An expired admin token
    // should not be presented as a missing database migration when the live
    // table is healthy; the save action still performs its own admin check.
    const publicResponse = await fetch(`${config.url}/rest/v1/homepage_category_showcase?${query}`, {
      headers: { apikey: config.key },
      cache: "no-store",
    });
    if (!publicResponse.ok) return { items: defaults, isDatabaseReady: false };

    const rows = (await publicResponse.json()) as CategoryShowcaseRow[];
    return { items: bind(mergeShowcaseRows(rows)), isDatabaseReady: true };
  } catch {
    return { items: defaults, isDatabaseReady: false };
  }
}

