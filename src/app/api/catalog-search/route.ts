import { NextResponse } from "next/server";
import { searchCatalog } from "@/data/catalog-search";
import { getStorefrontProducts } from "@/lib/public-catalog";
import { isSupabaseConfigured } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (rawQuery.length < 2 || rawQuery.length > 100) return NextResponse.json([]);

  const normalized = rawQuery.toLocaleLowerCase();
  // Categories remain searchable through the canonical category map, but demo
  // product links must never resurface once the managed catalog is connected.
  const staticResults = searchCatalog(rawQuery).filter(
    (item) => item.type === "Category" || !isSupabaseConfigured(),
  );
  const intentCategoryLinks = new Set(
    staticResults.filter((item) => item.type === "Category").map((item) => item.href.toLowerCase()),
  );

  const tokens = normalized.split(/[^a-z0-9]+/).filter((token) => token.length > 1);

  const storefrontProducts = await getStorefrontProducts();
  const managedResults = storefrontProducts
    .filter((product) => product.source === "managed")
    .filter((product) => {
      const categoryHref = `/category/${product.editorialGroup}/${product.categorySlug}`.toLowerCase();
      const legacyHref = `/category/${product.editorialGroup}/${product.subcategorySlug}`.toLowerCase();
      const queryHref = `/products?category=${product.categorySlug}`.toLowerCase();

      // Check if any intent matched this product's category
      const matchesIntentCategory =
        [...intentCategoryLinks].some(
          (href) =>
            href === categoryHref ||
            href === legacyHref ||
            href === queryHref ||
            href.includes(product.categorySlug) ||
            href.includes(product.subcategorySlug),
        );

      const specsText = Object.entries(product.specifications)
        .map(([k, v]) => `${k} ${v}`)
        .join(" ");

      const searchable = `${product.name} ${product.category} ${product.subcategory} ${
        product.brand ?? ""
      } ${product.modelNumber ?? ""} ${product.description ?? ""} ${specsText}`.toLowerCase();

      // Check if all search tokens match or if Roman Urdu intent matched the category
      const matchesTokens = tokens.length > 0 && tokens.every((token) => searchable.includes(token));

      return matchesIntentCategory || matchesTokens;
    })
    .map((product) => ({
      id: `managed:${product.id}`,
      title: product.name,
      detail: [product.brand, product.category].filter(Boolean).join(" · "),
      href: `/products/${product.slug}`,
      type: "Product" as const,
    }));

  // Merge managed products with static results, prioritizing managed products
  const results = [...managedResults, ...staticResults].filter(
    (result, index, all) => all.findIndex((item) => item.href === result.href) === index,
  );

  return NextResponse.json(results.slice(0, 12), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
