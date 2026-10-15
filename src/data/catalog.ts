export type ArtDirection = { scale: number; x: number; y: number; rotation?: number };
export type Product = { slug: string; name: string; category: string; kind: string; image: string; art: ArtDirection; palette: { base: string; panel: string; ink: string; accent: string }; note: string };
export type Category = { slug: string; name: string; image: string; art: ArtDirection; palette: { base: string; panel: string; ink: string }; subcategories: { name: string; slug: string }[] };

export const products: Product[] = [
  { slug: "front-load-washer", name: "Front Load Washer", category: "Laundry", kind: "Laundry care", image: "/products/temp/washer-temp.png", art: { scale: 1.08, x: 1, y: 2, rotation: -2 }, palette: { base: "#d9d6d0", panel: "#20282c", ink: "#f3f3ef", accent: "#b8ca72" }, note: "Temporary showroom image — model, specifications and availability to be confirmed." },
  { slug: "pedestal-fan", name: "Pedestal Fan", category: "Cooling", kind: "Air movement", image: "/products/temp/fan-temp.png", art: { scale: 1.14, x: -3, y: 0 }, palette: { base: "#c9d5d5", panel: "#143a3a", ink: "#f2f4ed", accent: "#d8c371" }, note: "Temporary showroom image — final product information will be added with NS inventory data." },
  { slug: "kitchen-blender", name: "Kitchen Blender", category: "Kitchen & Everyday", kind: "Everyday prep", image: "/products/temp/blender-temp.png", art: { scale: 1.03, x: 3, y: 4 }, palette: { base: "#e4dbd0", panel: "#613f2e", ink: "#fffaf2", accent: "#eaaf65" }, note: "Temporary showroom image — final product information will be added with NS inventory data." },
  { slug: "electric-geyser", name: "Electric Geyser", category: "Home", kind: "Home comfort", image: "/products/temp/geyser-temp.png", art: { scale: 1.08, x: 0, y: 0 }, palette: { base: "#c9c9c5", panel: "#222426", ink: "#f5f4f1", accent: "#b9d3d0" }, note: "Temporary showroom image — model, specifications and availability to be confirmed." },
];

export const categories: Category[] = [
  { slug: "cooling", name: "Cooling", image: "/products/temp/fan-temp.png", art: { scale: 1.2, x: 6, y: 0 }, palette: { base: "#e8ece9", panel: "#163f45", ink: "#f8faf7" }, subcategories: [{ name: "Room Coolers", slug: "room-coolers" }, { name: "Pedestal Fans", slug: "pedestal-fans" }, { name: "Ceiling Fans", slug: "ceiling-fans" }] },
  { slug: "laundry", name: "Laundry", image: "/products/temp/washer-temp.png", art: { scale: 1.12, x: 4, y: 3, rotation: -2 }, palette: { base: "#ede8df", panel: "#7e2e39", ink: "#fff9f4" }, subcategories: [{ name: "Washing Machines", slug: "washing-machines" }, { name: "Dryers", slug: "dryers" }] },
  { slug: "kitchen-everyday", name: "Kitchen & Everyday", image: "/products/temp/blender-temp.png", art: { scale: 1.06, x: 0, y: 2 }, palette: { base: "#f1eddf", panel: "#596044", ink: "#fbfbf4" }, subcategories: [{ name: "Juicers & Blenders", slug: "juicers-blenders" }, { name: "Irons", slug: "irons" }] },
  { slug: "home", name: "Home", image: "/products/temp/geyser-temp.png", art: { scale: 1.1, x: 0, y: 0 }, palette: { base: "#e7e4df", panel: "#25282a", ink: "#fbfbf6" }, subcategories: [{ name: "Geysers", slug: "geysers" }, { name: "Metal Safe Almirahs", slug: "metal-safe-almirahs" }] },
];

export const productBySlug = (slug: string) => products.find((product) => product.slug === slug);
