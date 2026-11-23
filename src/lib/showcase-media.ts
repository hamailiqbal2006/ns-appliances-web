export type ShowcaseMediaKind = "category" | "desktop" | "mobile";

export function showcaseMediaTarget(kind: ShowcaseMediaKind, slot: string) {
  if (!["category", "desktop", "mobile"].includes(kind)) throw new Error("Invalid image type.");
  if (kind === "category") {
    if (!["cooling", "laundry", "kitchen-everyday", "home"].includes(slot)) throw new Error("Invalid showcase category.");
    return { bucket: "product-images", prefix: `category-showcase/${slot}-` };
  }
  if (!/^[a-z0-9_-]{2,60}$/i.test(slot)) throw new Error("Invalid banner slot.");
  const folder = slot.toLowerCase();
  return { bucket: "homepage-banners", prefix: `${folder}/${kind === "mobile" ? "m-" : ""}` };
}

export function isShowcaseMediaPath(path: string, kind: ShowcaseMediaKind, slot: string) {
  const { prefix } = showcaseMediaTarget(kind, slot);
  return path.startsWith(prefix) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp|jpg)$/.test(path.slice(prefix.length));
}
