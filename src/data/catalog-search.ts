import { categories, products } from "@/data/catalog";

export type CatalogSearchResult = {
  id: string;
  title: string;
  detail: string;
  href: string;
  type: "Category" | "Product";
};

type CatalogItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  type: "Category" | "Product";
  categorySlug: string;
  subcategorySlug?: string;
  productSlug?: string;
};

// All available real routes and items in the catalog
const catalogItems: CatalogItem[] = [
  // Subcategories
  ...categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      id: `category:${cat.slug}:${sub.slug}`,
      title: sub.name,
      detail: cat.name,
      href: `/category/${cat.slug}/${sub.slug}`,
      type: "Category" as const,
      categorySlug: cat.slug,
      subcategorySlug: sub.slug,
    }))
  ),
  // Products
  ...products.map((prod) => ({
    id: `product:${prod.slug}`,
    title: prod.name,
    detail: prod.category,
    href: `/products/${prod.slug}`,
    type: "Product" as const,
    categorySlug: prod.category.toLowerCase().includes("kitchen") ? "kitchen-everyday" : prod.category.toLowerCase(),
    productSlug: prod.slug,
  })),
];

// Helper to normalize strings for search
export const normalizeQuery = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Specific intent definitions mapping Roman Urdu / English phrases to catalog targets
interface IntentRule {
  phrases: string[];
  // IDs in order of priority
  targets: string[];
}

const INTENT_RULES: IntentRule[] = [
  // 1. Washing machines specific
  {
    phrases: [
      "kapray dhone wali machine",
      "kapre dhone wali machine",
      "kaprey dhone wali machine",
      "kapra dhone wali machine",
      "dhone wali machine",
      "dhone wali",
      "washing wali machine",
      "washing machine",
      "washing machines",
      "front load washer",
      "washer",
      "washers",
      "dhulai machine",
      "washing",
    ],
    targets: [
      "category:laundry:washing-machines",
      "product:front-load-washer",
    ],
  },
  // 2. Dryers specific
  {
    phrases: [
      "dryer",
      "dryers",
      "kapre sukhanay ki machine",
      "kapray sukhanay ki machine",
      "kaprey sukhanay ki machine",
      "sukhanay ki machine",
      "sukhanay wali machine",
      "kapre sukhana",
      "kapray sukhana",
      "clothes dryer",
      "cloth dryer",
    ],
    targets: ["category:laundry:dryers"],
  },
  // 3. Generic Laundry (clothes) -> Laundry intent (Washing Machines & Dryers)
  {
    phrases: [
      "kapre",
      "kapray",
      "kaprey",
      "kapra",
      "kapro",
      "laundry",
      "clothes",
      "clothing",
    ],
    targets: [
      "category:laundry:washing-machines",
      "category:laundry:dryers",
      "product:front-load-washer",
    ],
  },
  // 4. Ceiling fan specific
  {
    phrases: [
      "chhat ka pankha",
      "chat ka pankha",
      "chhat pankha",
      "chat pankha",
      "ceiling fan",
      "ceiling fans",
      "chhat fan",
      "chat fan",
      "ceiling",
    ],
    targets: ["category:cooling:ceiling-fans"],
  },
  // 5. Pedestal fan specific
  {
    phrases: [
      "pedestal fan",
      "pedestal fans",
      "stand fan",
      "stand pankha",
      "farshi pankha",
      "khada pankha",
    ],
    targets: [
      "category:cooling:pedestal-fans",
      "product:pedestal-fan",
    ],
  },
  // 6. Generic fans (Pankha / Fan) -> Pedestal Fans & Ceiling Fans
  {
    phrases: [
      "pankha",
      "pankhay",
      "pankhe",
      "pankho",
      "fan",
      "fans",
      "hawa",
      "hawa wala",
    ],
    targets: [
      "category:cooling:pedestal-fans",
      "category:cooling:ceiling-fans",
      "product:pedestal-fan",
    ],
  },
  // 7. Room Coolers
  {
    phrases: [
      "cooler",
      "coolers",
      "room cooler",
      "room coolers",
      "air cooler",
      "air coolers",
      "garmi ka cooler",
      "lahore cooler",
      "desert cooler",
      "water cooler",
      "pani wala cooler",
      "thandi hawa",
    ],
    targets: ["category:cooling:room-coolers"],
  },
  // 8. Irons
  {
    phrases: [
      "istri",
      "istari",
      "istree",
      "isthree",
      "press",
      "iron",
      "irons",
      "clothes iron",
      "kapray press",
      "kapre press",
    ],
    targets: ["category:kitchen-everyday:irons"],
  },
  // 9. Juicers & Blenders
  {
    phrases: [
      "juicer",
      "juicers",
      "blender",
      "blenders",
      "juice machine",
      "juicer machine",
      "mixer",
      "kitchen blender",
      "shake machine",
      "milkshake machine",
      "grinder",
      "juicers blenders",
      "juicer blender",
    ],
    targets: [
      "category:kitchen-everyday:juicers-blenders",
      "product:kitchen-blender",
    ],
  },
  // 10. Geysers
  {
    phrases: [
      "geyser",
      "geysers",
      "geysar",
      "geysars",
      "gyser",
      "water heater",
      "garam pani",
      "pani garam",
      "electric geyser",
    ],
    targets: [
      "category:home:geysers",
      "product:electric-geyser",
    ],
  },
  // 11. Almirahs / Safes
  {
    phrases: [
      "almari",
      "almaris",
      "almirah",
      "almirahs",
      "almeera",
      "tijori",
      "tijori safe",
      "tijori almari",
      "safe",
      "locker",
      "metal safe",
      "metal safe almirahs",
      "metal almirah",
      "iron safe",
      "steel almirah",
      "steel almari",
    ],
    targets: ["category:home:metal-safe-almirahs"],
  },
  // 12. Top-level categories
  {
    phrases: ["cooling", "air cooling", "thanda"],
    targets: [
      "category:cooling:room-coolers",
      "category:cooling:pedestal-fans",
      "category:cooling:ceiling-fans",
      "product:pedestal-fan",
    ],
  },
  {
    phrases: ["kitchen", "kitchen everyday", "everyday"],
    targets: [
      "category:kitchen-everyday:juicers-blenders",
      "category:kitchen-everyday:irons",
      "product:kitchen-blender",
    ],
  },
  {
    phrases: ["home", "home appliances"],
    targets: [
      "category:home:geysers",
      "category:home:metal-safe-almirahs",
      "product:electric-geyser",
    ],
  },
];

// Helper to check 1-char edit distance for conservative typo correction
const isOneEditDistance = (s1: string, s2: string): boolean => {
  if (Math.abs(s1.length - s2.length) > 1) return false;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < s1.length && j < s2.length) {
    if (s1[i] !== s2[j]) {
      edits++;
      if (edits > 1) return false;
      if (s1.length > s2.length) i++;
      else if (s2.length > s1.length) j++;
      else {
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }
  if (i < s1.length || j < s2.length) edits++;
  return edits === 1;
};

export function searchCatalog(rawQuery: string): CatalogSearchResult[] {
  const query = normalizeQuery(rawQuery);
  if (!query || query.length < 2) return [];

  // Stop-words to ignore in multi-word queries
  const stopWords = new Set(["a", "an", "the", "ka", "ke", "ki", "wali", "wala", "walay", "me", "main", "ko", "and", "or"]);
  const queryTokens = query.split(" ").filter((w) => !stopWords.has(w));
  const effectiveQuery = queryTokens.join(" ");

  // 1. Direct Intent Matching (Highest Priority)
  // Check exact phrase match or if the effective query matches any intent phrase
  for (const rule of INTENT_RULES) {
    for (const phrase of rule.phrases) {
      const normPhrase = normalizeQuery(phrase);
      if (query === normPhrase || effectiveQuery === normPhrase) {
        return rule.targets
          .map((targetId) => catalogItems.find((item) => item.id === targetId))
          .filter((item): item is CatalogItem => item !== undefined)
          .map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            href: item.href,
            type: item.type,
          }));
      }
    }
  }

  // 2. Phrase contains intent or intent contains phrase
  // e.g. "mujhe kapray dhone wali machine chahiye" or "garmi ka cooler price"
  for (const rule of INTENT_RULES) {
    for (const phrase of rule.phrases) {
      const normPhrase = normalizeQuery(phrase);
      // If the query contains the complete intent phrase
      if (normPhrase.length >= 4 && query.includes(normPhrase)) {
        return rule.targets
          .map((targetId) => catalogItems.find((item) => item.id === targetId))
          .filter((item): item is CatalogItem => item !== undefined)
          .map((item) => ({
            id: item.id,
            title: item.title,
            detail: item.detail,
            href: item.href,
            type: item.type,
          }));
      }
    }
  }

  // 3. Exact Title Matching on Catalog Items
  const exactTitleMatches = catalogItems.filter(
    (item) => normalizeQuery(item.title) === query || normalizeQuery(item.title) === effectiveQuery
  );
  if (exactTitleMatches.length > 0) {
    return exactTitleMatches.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      href: item.href,
      type: item.type,
    }));
  }

  // 4. Token-level Substring Matching on Titles
  // If all significant query tokens are present in an item's title or category
  if (queryTokens.length > 0) {
    const scoredItems: { item: CatalogItem; score: number }[] = [];

    for (const item of catalogItems) {
      const normTitle = normalizeQuery(item.title);
      const normDetail = normalizeQuery(item.detail);
      const combined = `${normTitle} ${normDetail}`;

      let matches = 0;
      for (const token of queryTokens) {
        if (combined.includes(token)) {
          matches++;
        }
      }

      if (matches === queryTokens.length) {
        // High score if matched title directly
        const titleMatch = queryTokens.every((t) => normTitle.includes(t));
        const score = titleMatch ? 100 : 50;
        scoredItems.push({ item, score });
      }
    }

    if (scoredItems.length > 0) {
      scoredItems.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
      return scoredItems.map(({ item }) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        href: item.href,
        type: item.type,
      }));
    }
  }

  // 5. Conservative Typo Correction (single-word, length >= 4, edit distance <= 1)
  if (queryTokens.length === 1 && queryTokens[0].length >= 4) {
    const singleQuery = queryTokens[0];
    for (const rule of INTENT_RULES) {
      for (const phrase of rule.phrases) {
        const words = phrase.split(" ");
        for (const w of words) {
          if (w.length >= 4 && isOneEditDistance(singleQuery, w)) {
            return rule.targets
              .map((targetId) => catalogItems.find((item) => item.id === targetId))
              .filter((item): item is CatalogItem => item !== undefined)
              .map((item) => ({
                id: item.id,
                title: item.title,
                detail: item.detail,
                href: item.href,
                type: item.type,
              }));
          }
        }
      }
    }
  }

  // 6. No relevant match found: return empty array (NO random fuzzy or nonsense fallbacks!)
  return [];
}
