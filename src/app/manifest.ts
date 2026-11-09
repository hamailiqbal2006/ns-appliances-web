import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NS Home Appliances",
    short_name: "NS Home",
    description: "NS Home Appliances digital showroom.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0907",
    theme_color: "#0a0907",
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
