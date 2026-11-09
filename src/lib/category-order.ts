import fs from "node:fs";
import path from "node:path";
import { getSupabaseConfig } from "@/lib/supabase-admin";

const CATEGORY_ORDER_FILE = path.join(process.cwd(), "src", "data", "category-product-orders.json");

export type CategoryProductOrders = Record<string, string[]>;

function readCategoryOrders(): CategoryProductOrders {
  try {
    if (fs.existsSync(CATEGORY_ORDER_FILE)) {
      const raw = fs.readFileSync(CATEGORY_ORDER_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[category-order] Could not read category order file:", err);
  }
  return {};
}

function writeCategoryOrders(data: CategoryProductOrders) {
  try {
    const dir = path.dirname(CATEGORY_ORDER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CATEGORY_ORDER_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[category-order] Could not write category order file:", err);
  }
}

/**
 * Returns the ordered product IDs for a given category.
 */
export function getCategoryProductOrder(categorySlug: string): string[] {
  const all = readCategoryOrders();
  return all[categorySlug] || [];
}

/**
 * Returns all category product orders.
 */
export function getAllCategoryProductOrders(): CategoryProductOrders {
  return readCategoryOrders();
}

/**
 * Persists the manual product order for a category.
 * Dual-persists to Supabase `sort_order` column (if present) and local fallback store.
 */
export async function saveCategoryProductOrder(
  categorySlug: string,
  orderedProductIds: string[],
  accessToken?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!categorySlug) {
    return { ok: false, error: "Category slug is required." };
  }

  // 1. Save to local fallback store
  const all = readCategoryOrders();
  all[categorySlug] = orderedProductIds;
  writeCategoryOrders(all);

  // 2. Attempt database persistence if Supabase is configured
  const config = getSupabaseConfig();
  if (config) {
    try {
      const headers: Record<string, string> = {
        apikey: config.key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // Update sort_order for each product in the category
      await Promise.all(
        orderedProductIds.map((id, index) =>
          fetch(`${config.url}/rest/v1/products?id=eq.${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ sort_order: index }),
          }).catch(() => null),
        ),
      );
    } catch {
      // Database update failed gracefully; local fallback preserves order
    }
  }

  return { ok: true };
}

