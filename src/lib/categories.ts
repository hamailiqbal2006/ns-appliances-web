import "server-only";

import { getSupabaseConfig } from "@/lib/supabase-admin";
import {
  DEFAULT_CATEGORIES,
  resolveCategoryForProduct,
  type CategoryRecord,
} from "./category-types";

export * from "./category-types";

/**
 * Fetches all categories for the public storefront.
 * Tries Supabase first; if unmigrated or fails, falls back gracefully to DEFAULT_CATEGORIES.
 */
export async function getStorefrontCategories(): Promise<CategoryRecord[]> {
  const config = getSupabaseConfig();
  if (!config) return DEFAULT_CATEGORIES;

  try {
    const query = new URLSearchParams({
      select: "id,name,slug,description,editorial_group,display_order,is_active,subcategories,created_at,updated_at",
      is_active: "eq.true",
      order: "display_order.asc",
    });

    const response = await fetch(`${config.url}/rest/v1/categories?${query}`, {
      headers: { apikey: config.key },
      next: { revalidate: 300, tags: ["categories"] },
    });

    if (!response.ok) return DEFAULT_CATEGORIES;
    const data = (await response.json()) as CategoryRecord[];
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/**
 * Fetches categories with product counts for the admin portal.
 */
export async function getAdminCategories(accessToken?: string): Promise<{
  categories: CategoryRecord[];
  isDatabaseConnected: boolean;
}> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) {
    return { categories: DEFAULT_CATEGORIES, isDatabaseConnected: false };
  }

  let dbCategories: CategoryRecord[] = [];
  let isDatabaseConnected = false;

  try {
    const query = new URLSearchParams({
      select: "id,name,slug,description,editorial_group,display_order,is_active,subcategories,created_at,updated_at",
      order: "display_order.asc",
    });

    const response = await fetch(`${config.url}/rest/v1/categories?${query}`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as CategoryRecord[];
      // A successful table query is the schema check. An intentionally empty
      // category list is still a configured database, not a missing migration.
      if (Array.isArray(data)) {
        dbCategories = data;
        isDatabaseConnected = true;
      }
    }
  } catch {
    // Falls back to defaults
  }

  const baseCategories = isDatabaseConnected ? dbCategories : DEFAULT_CATEGORIES;

  // Compute product counts for each category
  try {
    const pResponse = await fetch(`${config.url}/rest/v1/products?select=id,category_slug,subcategory_slug`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (pResponse.ok) {
      const products = (await pResponse.json()) as Array<{
        id: string;
        category_slug: string;
        subcategory_slug: string;
      }>;

      const counts = new Map<string, number>();
      for (const cat of baseCategories) {
        counts.set(cat.slug, 0);
      }

      for (const p of products) {
        const resolved = resolveCategoryForProduct(p.category_slug, p.subcategory_slug, baseCategories);
        counts.set(resolved.slug, (counts.get(resolved.slug) ?? 0) + 1);
      }

      return {
        categories: baseCategories.map((cat) => ({
          ...cat,
          product_count: counts.get(cat.slug) ?? 0,
        })),
        isDatabaseConnected,
      };
    }
  } catch {
    // Ignore and return base
  }

  return {
    categories: baseCategories.map((cat) => ({ ...cat, product_count: 0 })),
    isDatabaseConnected,
  };
}

/**
 * Fetches a single category by id or slug.
 */
export async function getAdminCategory(
  idOrSlug: string,
  accessToken?: string,
): Promise<CategoryRecord | null> {
  const { categories } = await getAdminCategories(accessToken);
  return categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
}

/**
 * Saves a category (create or update) in Supabase.
 */
export async function saveAdminCategory(
  category: {
    id?: string;
    name: string;
    slug: string;
    description: string | null;
    editorial_group: CategoryRecord["editorial_group"];
    display_order: number;
    is_active: boolean;
    subcategories: CategoryRecord["subcategories"];
  },
  accessToken: string,
): Promise<CategoryRecord> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Admin backend is not configured.");

  const payload = {
    name: category.name,
    slug: category.slug,
    description: category.description,
    editorial_group: category.editorial_group,
    display_order: category.display_order,
    is_active: category.is_active,
    subcategories: category.subcategories,
    updated_at: new Date().toISOString(),
  };

  const isEdit = Boolean(category.id && !category.id.startsWith("cat-"));
  const url = isEdit
    ? `${config.url}/rest/v1/categories?id=eq.${encodeURIComponent(category.id!)}`
    : `${config.url}/rest/v1/categories`;

  const response = await fetch(url, {
    method: isEdit ? "PATCH" : "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404 || errorText.includes("schema cache")) {
      throw new Error(
        "Database table 'categories' not found. Please run supabase/migrations/20261027_categories_management.sql in the Supabase SQL editor.",
      );
    }
    if (errorText.includes("unique") || errorText.includes("categories_slug_key")) {
      throw new Error(`A category with the slug '${category.slug}' already exists.`);
    }
    throw new Error(errorText || "Could not save category to Supabase.");
  }

  const result = (await response.json()) as CategoryRecord[];
  return result[0];
}

/**
 * Safely deletes a category after ensuring no products are assigned to it.
 */
export async function deleteAdminCategory(
  id: string,
  categorySlug: string,
  accessToken: string,
): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Admin backend is not configured.");

  // Check product count first
  const { categories } = await getAdminCategories(accessToken);
  const target = categories.find((c) => c.id === id || c.slug === categorySlug);
  if (target && (target.product_count ?? 0) > 0) {
    throw new Error(
      `Cannot delete category '${target.name}' because it contains ${target.product_count} products. Reassign or remove its products first.`,
    );
  }

  const response = await fetch(`${config.url}/rest/v1/categories?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Could not delete category.");
  }
}
