import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getStorefrontProductBySlug } from "@/lib/public-catalog";
import { getSupabaseConfig } from "@/lib/supabase-admin";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const alt = "NS Home Appliances";

async function resolveProductImageData(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;

  try {
    // 1. Local public static asset (e.g., "/products/temp/washer-temp.png")
    if (imagePath.startsWith("/products/") || imagePath.startsWith("/")) {
      const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
      const filePath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      }
    }

    // 2. Storage media proxy URL (e.g., "/api/product-media/products/...")
    if (imagePath.includes("/api/product-media/")) {
      const parts = imagePath.split("/api/product-media/")[1];
      const config = getSupabaseConfig();
      if (config && parts) {
        const decodedPath = parts.split("/").map(decodeURIComponent).join("/");
        const res = await fetch(
          `${config.url}/storage/v1/object/authenticated/product-images/${decodedPath}`,
          {
            headers: {
              apikey: config.key,
              Authorization: `Bearer ${config.key}`,
            },
          },
        );
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mime = res.headers.get("content-type") || "image/jpeg";
          return `data:${mime};base64,${buffer.toString("base64")}`;
        }
      }
    }

    // 3. Absolute HTTP / HTTPS URL
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      const res = await fetch(imagePath, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = res.headers.get("content-type") || "image/jpeg";
        return `data:${mime};base64,${buffer.toString("base64")}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#faf9f4",
            padding: "48px",
            border: "12px solid #ece7db",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "#1c2125",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              padding: "10px 24px",
              borderRadius: "6px",
              textTransform: "uppercase",
            }}
          >
            NS HOME APPLIANCES
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "44px",
              fontWeight: 800,
              color: "#181a1b",
              marginTop: "24px",
            }}
          >
            Digital Showroom · Gujranwala
          </div>
        </div>
      ),
      { ...size },
    );
  }

  // Determine candidate images based on priority:
  // 1. Approved product cover image
  // 2. First approved gallery image
  const candidates: string[] = [];
  if (product.image) candidates.push(product.image);
  if (product.galleryImages && product.galleryImages.length > 0) {
    for (const g of product.galleryImages) {
      if (g.mediaType !== "video" && g.url && !candidates.includes(g.url)) {
        candidates.push(g.url);
      }
    }
  }

  let imageDataUrl: string | null = null;
  for (const candidate of candidates) {
    const dataUrl = await resolveProductImageData(candidate);
    if (dataUrl) {
      imageDataUrl = dataUrl;
      break;
    }
  }

  // STATE A: Product has an approved genuine photograph
  if (imageDataUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            backgroundColor: "#fcfbf7",
            padding: "40px 44px",
            boxSizing: "border-box",
            border: "12px solid #ede9df",
            fontFamily: "sans-serif",
          }}
        >
          {/* Left Column: Product Information & Restrained Branding */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "480px",
              height: "100%",
              paddingRight: "28px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  backgroundColor: "#1c2125",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  padding: "8px 18px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                }}
              >
                NS HOME APPLIANCES
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "12px",
                  color: "#827e74",
                  letterSpacing: "0.08em",
                  marginTop: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                DIGITAL SHOWROOM • GUJRANWALA
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "13px",
                  color: "#997b48",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginTop: "22px",
                }}
              >
                {product.category} {product.subcategory ? `• ${product.subcategory}` : ""}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: product.name.length > 30 ? "34px" : "42px",
                  fontWeight: 800,
                  color: "#181a1b",
                  lineHeight: 1.15,
                  marginTop: "12px",
                }}
              >
                {product.name}
              </div>
              {product.pricePkr ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "#1b4d3e",
                    marginTop: "16px",
                  }}
                >
                  PKR {product.pricePkr.toLocaleString()}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#6b675e",
                    marginTop: "14px",
                  }}
                >
                  Price confirmed upon showroom visit
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid #e2ddd0",
                paddingTop: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#35322b",
                  lineHeight: 1.4,
                }}
              >
                Guaranteed Genuine Showroom Inventory
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "12px",
                  color: "#7e7a70",
                  marginTop: "4px",
                }}
              >
                Official Product Link • Direct WhatsApp Inquiries
              </div>
            </div>
          </div>

          {/* Right Column: Contained Appliance Photograph */}
          <div
            style={{
              display: "flex",
              flex: 1,
              height: "100%",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e4e0d5",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt={product.name}
              width={540}
              height={460}
              style={{
                objectFit: "contain",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>
      ),
      { ...size },
    );
  }

  // STATE B: Neutral NS Appliances Showroom Fallback (honest indication, no fake appliance)
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#faf9f4",
          padding: "48px 56px",
          boxSizing: "border-box",
          border: "12px solid #ece7db",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "#1c2125",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "8px 18px",
              borderRadius: "6px",
              textTransform: "uppercase",
            }}
          >
            NS HOME APPLIANCES
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "13px",
              color: "#7e7a70",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            OFFICIAL DIGITAL SHOWROOM • GUJRANWALA
          </div>
        </div>

        {/* Middle Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            flex: 1,
            padding: "20px 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "#ede8dd",
              color: "#735e3b",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "6px 16px",
              borderRadius: "20px",
              textTransform: "uppercase",
              marginBottom: "20px",
            }}
          >
            {product.category} {product.subcategory ? `• ${product.subcategory}` : ""}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: product.name.length > 40 ? "46px" : "56px",
              fontWeight: 800,
              color: "#181a1b",
              lineHeight: 1.15,
              textAlign: "center",
              marginBottom: "24px",
              maxWidth: "1000px",
            }}
          >
            {product.name}
          </div>

          {/* Honest Showroom Notification Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#ffffff",
              border: "1px solid #ded9cc",
              borderRadius: "10px",
              padding: "16px 28px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                fontWeight: 600,
                color: "#3a3730",
              }}
            >
              Showroom Photography in Preparation • Genuine Store Inventory
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "15px",
              color: "#7e7a70",
              marginTop: "18px",
              textAlign: "center",
            }}
          >
            Contact our showroom team directly on WhatsApp for live pricing, visiting hours, and appliance inspection.
          </div>
        </div>

        {/* Bottom Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            borderTop: "1px solid #e2ddd0",
            paddingTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "13px",
              color: "#6b675e",
              fontWeight: 500,
            }}
          >
            NS Home Appliances · Nowshera Road, Gujranwala
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              color: "#1c2125",
              fontWeight: 700,
            }}
          >
            Inquiries: 0300-6791460
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
