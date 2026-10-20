import { categories, products } from "@/data/catalog";

export type CatalogSearchResult = {
  id: string;
  title: string;
  detail: string;
  href: string;
  type: "Product" | "Category";
};

type SearchEntry = CatalogSearchResult & { keywords: string[] };

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const words = (value: string) => normalize(value).split(" ").filter(Boolean);
const ignoredWords = new Set(["a", "an", "and", "appliance", "appliances", "ka", "ke", "ki", "wali", "wala", "machine"]);

const aliases: Record<string, string[]> = {
  "product:front-load-washer": ["washer", "washing machine", "washing wali machine", "kapray dhone wali machine", "kapray dho", "laundry machine"],
  "product:pedestal-fan": ["pankha", "pankhay", "fan", "pedestal fan", "stand fan"],
  "product:kitchen-blender": ["blender", "juicer", "juice machine", "mixer", "kitchen blender"],
  "product:electric-geyser": ["geyser", "geysar", "water heater", "garam pani", "electric geyser"],
  "category:cooling:room-coolers": ["cooler", "room cooler", "air cooler", "air cooling"],
  "category:cooling:pedestal-fans": ["pedestal fan", "stand fan", "pankha", "pankhay"],
  "category:cooling:ceiling-fans": ["ceiling fan", "ceiling pankha", "pankha ceiling", "chhat ka pankha", "chhat fan"],
  "category:laundry:washing-machines": ["washing machine", "washer", "washing wali machine", "kapray dhone wali machine"],
  "category:laundry:dryers": ["dryer", "clothes dryer", "kapray sukhanay wali machine"],
  "category:kitchen-everyday:juicers-blenders": ["juicer", "blender", "juice machine", "mixer"],
  "category:kitchen-everyday:irons": ["iron", "istri", "istari", "press"],
  "category:home:geysers": ["geyser", "geysar", "water heater", "garam pani"],
  "category:home:metal-safe-almirahs": ["almirah", "almari", "tijori", "safe", "locker", "metal safe"],
};

const entries: SearchEntry[] = [
  ...products.map((product) => ({
    id: `product:${product.slug}`,
    title: product.name,
    detail: `${product.category} · ${product.kind}`,
    href: `/products/${product.slug}`,
    type: "Product" as const,
    keywords: [product.name, product.category, product.kind, ...(aliases[`product:${product.slug}`] ?? [])],
  })),
  ...categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      id: `category:${category.slug}:${subcategory.slug}`,
      title: subcategory.name,
      detail: category.name,
      href: `/category/${category.slug}/${subcategory.slug}`,
      type: "Category" as const,
      keywords: [category.name, subcategory.name, ...(aliases[`category:${category.slug}:${subcategory.slug}`] ?? [])],
    })),
  ),
];

const editDistanceAtMostOne = (first: string, second: string) => {
  if (Math.abs(first.length - second.length) > 1) return false;
  let differences = 0;
  let left = 0;
  let right = 0;
  while (left < first.length && right < second.length) {
    if (first[left] === second[right]) {
      left += 1;
      right += 1;
    } else {
      differences += 1;
      if (differences > 1) return false;
      if (first.length > second.length) left += 1;
      else if (second.length > first.length) right += 1;
      else {
        left += 1;
        right += 1;
      }
    }
  }
  return true;
};

const scoreEntry = (entry: SearchEntry, rawQuery: string) => {
  const query = normalize(rawQuery);
  if (!query) return 0;
  const title = normalize(entry.title);
  const keywords = entry.keywords.map(normalize);
  if (title === query) return 1_000;
  if (keywords.some((keyword) => keyword === query)) return 900;
  if (title.includes(query)) return 820;
  if (keywords.some((keyword) => keyword.includes(query))) return 760;

  const queryWords = words(query).filter((word) => !ignoredWords.has(word));
  if (!queryWords.length) return 0;
  const candidateWords = keywords.flatMap(words);
  const directMatches = queryWords.filter((queryWord) =>
    candidateWords.some((candidateWord) => candidateWord === queryWord || candidateWord.startsWith(queryWord) || queryWord.startsWith(candidateWord)),
  );
  if (directMatches.length === queryWords.length) return 620 + directMatches.length * 20;

  if (queryWords.length === 1 && queryWords[0].length >= 4 && candidateWords.some((candidateWord) => editDistanceAtMostOne(queryWords[0], candidateWord))) {
    return 420;
  }
  return 0;
};

export function searchCatalog(query: string): CatalogSearchResult[] {
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score || first.entry.title.localeCompare(second.entry.title))
    .map(({ entry }) => ({ id: entry.id, title: entry.title, detail: entry.detail, href: entry.href, type: entry.type }));
}
