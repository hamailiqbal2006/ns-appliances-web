import { NextResponse } from "next/server";
import { searchCatalog } from "@/data/catalog-search";
import { getStorefrontProducts } from "@/lib/public-catalog";
import { isSupabaseConfigured } from "@/lib/supabase-admin";
import { getStorefrontCategories, findCategoryForRoute } from "@/lib/categories";

export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (rawQuery.length < 2 || rawQuery.length > 100) return NextResponse.json([]);

  const normalized = rawQuery.toLocaleLowerCase();
  const categories = await getStorefrontCategories();
  // Retain Roman Urdu intent matching, but resolve its links against live categories.
  const staticResults = searchCatalog(rawQuery).flatMap((item) => {
    if (item.type !== "Category") return isSupabaseConfigured() ? [] : [item];
    const [, , group, slug] = item.href.split("/");
    const category = findCategoryForRoute(group, slug ?? null, categories);
    return category ? [{ ...item, title: category.name,
      href: `/category/${category.editorial_group}/${category.slug}` }] : [];
  });
  const intentCategoryLinks = new Set(
    staticResults.filter((item) => item.type === "Category").map((item) => item.href.toLowerCase()),
  );

  const tokens = normalized.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
  const categoryResults = categories.filter((category) => {
    const searchable = `${category.name} ${category.slug} ${category.description ?? ""} ${category.subcategories.map((sub) => sub.name).join(" ")}`.toLowerCase();
    return tokens.length > 0 && tokens.every((token) => searchable.includes(token));
  }).map((category) => ({
    id: `category:${category.id}`, title: category.name,
    detail: "Appliance category", href: `/category/${category.editorial_group}/${category.slug}`,
    type: "Category" as const,
  }));

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
  const results = [...managedResults, ...categoryResults, ...staticResults].filter(
    (result, index, all) => all.findIndex((item) => item.href === result.href) === index,
  );

  return NextResponse.json(results.slice(0, 12), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
