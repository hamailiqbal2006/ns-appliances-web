"use client";

import { startTransition, useActionState, useState, useMemo, useRef } from "react";
import Link from "next/link";
import type { CategoryRecord } from "@/lib/category-types";
import type { AdminProduct } from "@/lib/supabase-admin";
import {
  type ProductAvailability,
  resolveAvailabilityStatus,
} from "@/lib/product-availability";
import { saveProductAction } from "../../actions";
import { AdminSwitch } from "../../admin-switch";
import styles from "../../admin.module.css";

function specificationsToText(specifications: Record<string, string>) {
  if (!specifications) return "";
  return Object.entries(specifications)
    .filter(([key]) => key !== "Brand" && key !== "Model Number" && key !== "Model")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

export type AdminGalleryItem = {
  id?: string;
  storagePath: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
  mediaType?: "image" | "video";
};

export function ProductForm({
  product,
  imageUrl,
  categories,
  initialGallery = [],
}: {
  product?: AdminProduct;
  imageUrl: string | null;
  categories: CategoryRecord[];
  initialGallery?: AdminGalleryItem[];
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, { error: null });

  // Initial category resolution
  const initialCategorySlug = useMemo(() => {
    if (!product) return categories[0]?.slug ?? "room-coolers";
    const direct = categories.find((c) => c.slug === product.category_slug);
    if (direct) return direct.slug;
    const sub = categories.find((c) => c.slug === product.subcategory_slug);
    if (sub) return sub.slug;
    return categories[0]?.slug ?? "room-coolers";
  }, [product, categories]);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState(initialCategorySlug);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState(product?.subcategory_slug ?? "");
  const [isActive, setIsActive] = useState(product?.status === "active");

  const initialAvailability = useMemo(() => resolveAvailabilityStatus(product), [product]);
  const [availability, setAvailability] = useState<ProductAvailability>(initialAvailability);
  const [stockQuantity, setStockQuantity] = useState<string>(() => {
    if (product?.stock_quantity !== null && product?.stock_quantity !== undefined && product.stock_quantity > 0) {
      return String(product.stock_quantity);
    }
    if (
      product?.stock_quantity === 0 &&
      (product?.specifications?.explicit_zero_stock === "true" || product?.specifications?.out_of_stock === "true")
    ) {
      return "0";
    }
    return "";
  });

  // Brand and Model extracted from specifications or direct fields
  const initialBrand =
    (product as { brand?: string | null })?.brand ||
    product?.specifications?.Brand ||
    product?.specifications?.brand ||
    "";

  const initialModel =
    (product as { model_number?: string | null })?.model_number ||
    product?.specifications?.["Model Number"] ||
    product?.specifications?.Model ||
    product?.specifications?.model ||
    "";

  // Gallery items state
  const [gallery, setGallery] = useState<AdminGalleryItem[]>(() => {
    if (initialGallery && initialGallery.length > 0) return initialGallery;
    if (product?.image_path && imageUrl) {
      return [
        {
          id: `initial-cover`,
          storagePath: product.image_path,
          url: imageUrl,
          altText: product.name,
          isPrimary: true,
          sortOrder: 0,
        },
      ];
    }
    return [];
  });

  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const uploadSessionId = useRef<string>(product?.id ?? crypto.randomUUID());
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [aspectRatioWarning, setAspectRatioWarning] = useState<string | null>(null);

  // Active category's subcategories
  const currentCategory = categories.find((c) => c.slug === selectedCategorySlug);
  const availableSubcategories = currentCategory?.subcategories ?? [];

  const handleMakePrimary = (index: number) => {
    setGallery((prev) => {
      const target = prev[index];
      const isVideo =
        target.mediaType === "video" ||
        /\.(mp4|webm)$/i.test(target.storagePath || target.url);
      if (isVideo) return prev; // Video can never be cover

      return prev.map((item, idx) => ({
        ...item,
        isPrimary: idx === index,
      }));
    });
  };

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    setGallery((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  const handleRemoveImage = (index: number) => {
    setGallery((prev) => {
      const removed = prev[index];
      const remaining = prev.filter((_, idx) => idx !== index);
      if (removed.isPrimary && remaining.length > 0) {
        // Find next non-video item to make primary
        const nextImg = remaining.find(
          (m) =>
            m.mediaType !== "video" &&
            !/\.(mp4|webm)$/i.test(m.storagePath || m.url),
        );
        if (nextImg) nextImg.isPrimary = true;
      }
      return remaining.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  const handleAltTextChange = (index: number, alt: string) => {
    setGallery((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, altText: alt } : item)),
    );
  };

  const handleMultiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    setAspectRatioWarning(null);
    const files = e.target.files;
    if (!files || files.length === 0) {
      setNewFilePreviews([]);
      return;
    }

    const previews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setImageError(`File ${file.name} exceeds 5 MB. Please choose smaller images.`);
        e.target.value = "";
        setNewFilePreviews([]);
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setImageError(`File ${file.name} is not JPEG, PNG, or WebP.`);
        e.target.value = "";
        setNewFilePreviews([]);
        return;
      }
      previews.push(URL.createObjectURL(file));

      // Non-blocking aspect ratio inspection
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          if (ratio < 0.8 || ratio > 1.25) {
            setAspectRatioWarning(
              "Note: One or more selected images have non-square aspect ratios. They will be displayed centered with neutral letterboxing in the catalog canvas without distorting or cropping the appliance.",
            );
          }
        }
      };
    }
    setNewFilePreviews(previews);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setVideoPreview(null);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setVideoError(`Video file (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 20 MB limit.`);
      e.target.value = "";
      setVideoPreview(null);
      return;
    }
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setVideoError("Only MP4 and WebM video formats are supported.");
      e.target.value = "";
      setVideoPreview(null);
      return;
    }
    setVideoPreview(URL.createObjectURL(file));
  };

  const uploadFileDirectly = async (file: File, kind: "image" | "video") => {
    const allowedTypes = kind === "image"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["video/mp4", "video/webm"];
    const maximumSize = kind === "image" ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (!(file instanceof File) || file.size <= 0) {
      throw new Error(`Choose a non-empty ${kind} file and try again.`);
    }
    if (!allowedTypes.includes(file.type)) {
      throw new Error(kind === "image" ? "Use a JPEG, PNG, or WebP image." : "Use an MP4 or WebM video.");
    }
    if (file.size > maximumSize) {
      throw new Error(kind === "image" ? "Images must be 5 MB or smaller." : "Videos must be 20 MB or smaller.");
    }

    console.info("[product-media-upload] direct upload starting", {
      method: "PUT",
      route: "Supabase signed upload URL",
      contentType: file.type,
      bodyBytes: file.size,
      kind,
    });
    const ticket = await fetch("/api/admin/product-media-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: uploadSessionId.current,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        kind,
      }),
    });
    const ticketData = (await ticket.json().catch(() => null)) as { path?: string; uploadUrl?: string; error?: string } | null;
    if (!ticket.ok || !ticketData?.path || !ticketData.uploadUrl) {
      throw new Error(ticketData?.error || "Could not prepare the secure media upload.");
    }

    const transfer = await fetch(ticketData.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-upsert": "false",
        "cache-control": "max-age=3600",
      },
      body: file,
    });
    console.info("[product-media-upload] direct upload response", {
      status: transfer.status,
      ok: transfer.ok,
      kind,
    });
    if (!transfer.ok) {
      const detail = (await transfer.json().catch(() => null)) as { message?: string } | null;
      throw new Error(detail?.message || `Supabase Storage rejected the ${kind} (HTTP ${transfer.status}).`);
    }
    return { path: ticketData.path, kind };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || uploadingMedia) return;

    const formData = new FormData(event.currentTarget);
    const images = formData.getAll("new_images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const video = formData.get("product_video");
    if (images.length === 0 && !(video instanceof File && video.size > 0)) {
      startTransition(() => formAction(formData));
      return;
    }

    setUploadingMedia(true);
    setUploadError(null);
    try {
      const uploaded = [] as Array<{ path: string; kind: "image" | "video" }>;
      for (const file of images) uploaded.push(await uploadFileDirectly(file, "image"));
      if (video instanceof File && video.size > 0) uploaded.push(await uploadFileDirectly(video, "video"));
      // Do not send binary media through the Server Action/hosting proxy.
      formData.delete("new_images");
      formData.delete("product_video");
      formData.set("direct_media_uploads", JSON.stringify(uploaded));
      startTransition(() => formAction(formData));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The media upload could not be completed.");
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <form className={styles.editorForm} action={formAction} onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="existing_image_path" value={product?.image_path ?? ""} />

      <fieldset>
        <legend>Product identification</legend>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldWide}>
            Product name <span style={{ color: "var(--admin-danger)" }}>*</span>
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={product?.name ?? ""}
              placeholder="e.g. Super Asia Room Cooler Deluxe 5000"
            />
          </label>

          <label>
            URL slug
            <input
              name="slug"
              pattern="[a-z0-9-]+"
              defaultValue={product?.slug ?? ""}
              placeholder="e.g. room-cooler-deluxe-5000"
              aria-describedby="slug-help"
            />
            <span id="slug-help" className={styles.fieldHelp}>
              Leave blank to automatically generate from the product name.
            </span>
          </label>

          <label>
            Category <span style={{ color: "var(--admin-danger)" }}>*</span>
            <select
              name="category"
              required
              value={selectedCategorySlug}
              onChange={(e) => {
                setSelectedCategorySlug(e.target.value);
                setSelectedSubcategorySlug("");
              }}
            >
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Subcategory (Optional)
            <select
              name="subcategory"
              value={selectedSubcategorySlug}
              onChange={(e) => setSelectedSubcategorySlug(e.target.value)}
            >
              <option value="">General / None</option>
              {availableSubcategories.map((sub) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Brand
            <input
              name="brand"
              defaultValue={initialBrand}
              placeholder="e.g. NS, Super Asia, Kenwood, Waves"
            />
          </label>

          <label>
            Model number
            <input
              name="model_number"
              defaultValue={initialModel}
              placeholder="e.g. NS-5000, RC-80"
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Price & availability</legend>
        <div className={styles.fieldGrid}>
          <label>
            Price (PKR)
            <input
              name="price_pkr"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              defaultValue={product?.price_pkr ?? ""}
              placeholder="Optional — leave blank if not confirmed"
            />
          </label>

          <label>
            <span>Tracked stock quantity (optional)</span>
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={stockQuantity}
              onChange={(e) => {
                const val = e.target.value;
                setStockQuantity(val);
                if (val !== "" && Number(val) > 0 && availability === "not_confirmed") {
                  setAvailability("available");
                } else if (val === "0" && availability !== "available") {
                  setAvailability("out_of_stock");
                }
              }}
              placeholder="Leave empty for untracked / showroom display"
            />
            <span className={styles.fieldHelp}>
              Optional warehouse inventory count. Leave blank if untracked. Setting 0 marks out of stock.
            </span>
          </label>

          <div className={styles.fieldWide}>
            <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--admin-text-primary)", display: "block", marginBottom: "4px" }}>
              Showroom availability status
            </span>
            <p style={{ margin: "0 0 10px 0", color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.45 }}>
              Controls catalog availability badges. Inquiries remain open across all states. Defaults to <em>Availability Not Confirmed</em> for new products.
            </p>
            <div className={styles.availabilityOptionGrid}>
              {/* Option 1: Not Confirmed */}
              <label
                className={`${styles.availabilityCard} ${
                  availability === "not_confirmed" ? styles.availabilityCardChecked : ""
                }`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 650 }}>
                    <input
                      type="radio"
                      name="_availability_radio"
                      value="not_confirmed"
                      checked={availability === "not_confirmed"}
                      onChange={() => setAvailability("not_confirmed")}
                      style={{ width: "16px", height: "16px", margin: 0, accentColor: "var(--admin-primary)" }}
                    />
                    <span>Not Confirmed</span>
                  </div>
                  <span className={styles.availabilityBadge} data-availability="not_confirmed">Default</span>
                </div>
                <span style={{ color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.4, marginTop: "4px" }}>
                  Product is listed with unverified stock. Customers can inquire to verify showroom availability.
                </span>
              </label>

              {/* Option 2: Available */}
              <label
                className={`${styles.availabilityCard} ${
                  availability === "available" ? styles.availabilityCardChecked : ""
                }`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 650 }}>
                    <input
                      type="radio"
                      name="_availability_radio"
                      value="available"
                      checked={availability === "available"}
                      onChange={() => setAvailability("available")}
                      style={{ width: "16px", height: "16px", margin: 0, accentColor: "var(--admin-primary)" }}
                    />
                    <span>Available / In Stock</span>
                  </div>
                  <span className={styles.availabilityBadge} data-availability="available">In Stock</span>
                </div>
                <span style={{ color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.4, marginTop: "4px" }}>
                  Product is confirmed in stock. Displays In Stock badge on catalog and product page.
                </span>
              </label>

              {/* Option 3: Out of Stock */}
              <label
                className={`${styles.availabilityCard} ${
                  availability === "out_of_stock" ? styles.availabilityCardChecked : ""
                }`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 650 }}>
                    <input
                      type="radio"
                      name="_availability_radio"
                      value="out_of_stock"
                      checked={availability === "out_of_stock"}
                      onChange={() => setAvailability("out_of_stock")}
                      style={{ width: "16px", height: "16px", margin: 0, accentColor: "var(--admin-primary)" }}
                    />
                    <span>Out of Stock</span>
                  </div>
                  <span className={styles.availabilityBadge} data-availability="out_of_stock">Unavailable</span>
                </div>
                <span style={{ color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.4, marginTop: "4px" }}>
                  Explicitly unavailable. Displays Out of Stock badge, while still allowing customer restock inquiries.
                </span>
              </label>
            </div>
            <input type="hidden" name="availability_status" value={availability} />
          </div>

          <div className={styles.fieldWide}>
            <span style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--admin-text-primary)", display: "block", marginBottom: "6px" }}>
              Customer website visibility
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                padding: "12px 14px",
                border: "1px solid var(--admin-border)",
                borderRadius: "var(--admin-radius-sm)",
                backgroundColor: "var(--admin-surface-muted)",
              }}
            >
              <div>
                <strong style={{ display: "block", color: "var(--admin-text-primary)", fontSize: "13px" }}>
                  {isActive ? "Active — published on customer website" : "Draft — hidden from customer website"}
                </strong>
                <span style={{ display: "block", marginTop: "2px", color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.4 }}>
                  When inactive, this appliance is hidden completely from the customer storefront, collections, and search.
                </span>
              </div>
              <AdminSwitch
                checked={isActive}
                onChange={setIsActive}
                ariaLabel="Make this product active on the customer website"
              />
            </div>
          </div>
        </div>
      </fieldset>
      <input type="hidden" name="status" value={isActive ? "active" : "draft"} />

      <fieldset>
        <legend>Product details & specifications</legend>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldWide}>
            Description
            <textarea
              name="description"
              rows={4}
              defaultValue={product?.description ?? ""}
              placeholder="Official product description, capacity, power, features..."
            />
          </label>

          <label className={styles.fieldWide}>
            Specifications
            <textarea
              name="specifications"
              rows={5}
              defaultValue={product ? specificationsToText(product.specifications) : ""}
              aria-describedby="specifications-help"
              placeholder="Motor: 100% Pure Copper&#10;Body: High-Grade Anti-Shock Plastic&#10;Water Tank: 60 Litres&#10;Speed Levels: 3 Speed Settings"
            />
            <span id="specifications-help" className={styles.fieldHelp}>
              One specification per line in “Label: value” format.
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Product imagery & gallery ({gallery.length} item{gallery.length === 1 ? "" : "s"})</legend>

        {/* Aspect Ratio and Video Guidelines Banner */}
        <div style={{ background: "var(--admin-surface-muted)", border: "1px solid var(--admin-border)", borderRadius: "8px", padding: "14px 18px", marginTop: "16px", marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "13px", color: "var(--admin-text-primary)" }}>
                Recommended image: 1200 × 1200 px (1:1)
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
                Keep the complete appliance visible with space around the edges. WebP, JPG or PNG.
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "13px", color: "var(--admin-text-primary)" }}>
                Product video: MP4 recommended
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
                Short product demonstration, up to 20 MB (15–30 seconds recommended).
              </p>
            </div>
          </div>
        </div>

        <input
          type="hidden"
          name="gallery_items"
          value={JSON.stringify(
            gallery.map((g, idx) => ({
              storage_path: g.storagePath,
              alt_text: g.altText || "",
              is_primary: g.isPrimary,
              sort_order: idx,
              media_type: g.mediaType || (/\.(mp4|webm)$/i.test(g.storagePath || g.url) ? "video" : "image"),
            })),
          )}
        />
        <input type="hidden" name="has_existing_gallery" value={initialGallery.length > 0 ? "true" : "false"} />
        <input
          type="hidden"
          name="existing_image_path"
          value={gallery.find((g) => g.isPrimary && g.mediaType !== "video")?.storagePath || product?.image_path || ""}
        />

        {/* Existing Gallery Media Items */}
        {gallery.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--admin-text-secondary)" }}>
              The <strong>Cover photo</strong> is displayed on the All Appliances catalog card. All images and videos appear in the interactive product detail gallery.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {gallery.map((item, idx) => {
                const isVideo =
                  item.mediaType === "video" ||
                  /\.(mp4|webm)$/i.test(item.storagePath || item.url);
                return (
                  <div
                    key={item.id || item.storagePath || idx}
                    style={{
                      border: item.isPrimary ? "2px solid var(--admin-primary)" : "1px solid var(--admin-border)",
                      borderRadius: "8px",
                      background: item.isPrimary ? "var(--admin-primary-light)" : "var(--admin-surface)",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      position: "relative",
                    }}
                  >
                    <div style={{ position: "relative", width: "100%", height: "140px", background: "var(--admin-surface-muted)", borderRadius: "6px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isVideo ? (
                        <video
                          src={item.url}
                          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
                          controls
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.altText || `Product image ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      )}
                      {item.isPrimary && !isVideo && (
                        <span
                          style={{
                            position: "absolute",
                            top: "6px",
                            left: "6px",
                            background: "var(--admin-primary)",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            padding: "3px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          Cover photo
                        </span>
                      )}
                      {isVideo && (
                        <span
                          style={{
                            position: "absolute",
                            top: "6px",
                            left: "6px",
                            background: "#312e81",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            padding: "3px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          Video
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--admin-text-secondary)", marginBottom: "4px" }}>
                        {isVideo ? "Video description" : "Image alt text"}
                        <input
                          type="text"
                          value={item.altText}
                          onChange={(e) => handleAltTextChange(idx, e.target.value)}
                          placeholder={isVideo ? "e.g. Demonstration video" : "e.g. Front view, Control panel"}
                          style={{ fontSize: "12px", padding: "6px 8px", marginTop: "2px" }}
                        />
                      </label>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "auto" }}>
                      {!item.isPrimary && !isVideo && (
                        <button
                          type="button"
                          onClick={() => handleMakePrimary(idx)}
                          style={{
                            background: "var(--admin-primary)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            padding: "5px 9px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Set as cover
                        </button>
                      )}

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, "up")}
                          style={{
                            background: "var(--admin-surface-muted)",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "4px",
                            padding: "5px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                          title="Move left/up"
                        >
                          &larr;
                        </button>
                      )}

                      {idx < gallery.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, "down")}
                          style={{
                            background: "var(--admin-surface-muted)",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "4px",
                            padding: "5px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                          title="Move right/down"
                        >
                          &rarr;
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{
                          marginLeft: "auto",
                          background: "var(--admin-danger-bg)",
                          color: "var(--admin-danger)",
                          border: "1px solid var(--admin-border)",
                          borderRadius: "4px",
                          padding: "5px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: "16px", background: "var(--admin-surface-muted)", borderRadius: "6px", color: "var(--admin-text-secondary)", fontSize: "13px", marginTop: "16px", marginBottom: "16px" }}>
            No gallery media attached to this product yet.
          </div>
        )}

        {/* Upload Multiple Product Photographs */}
        <div style={{ marginTop: "20px", borderTop: "1px solid var(--admin-border)", paddingTop: "20px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700 }}>Add new product photographs</span>
            <input
              name="new_images"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleMultiImageChange}
            />
          </label>
          <p className={styles.fieldHelp} style={{ marginTop: "6px" }}>
            Select one or multiple real appliance photographs. Recommended 1200 × 1200 px (1:1). JPEG, PNG, or WebP; maximum 5 MB each.
          </p>

          {imageError && (
            <p style={{ color: "var(--admin-danger)", fontSize: "12px", marginTop: "6px" }}>
              {imageError}
            </p>
          )}

          {aspectRatioWarning && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", marginTop: "8px" }}>
              {aspectRatioWarning}
            </div>
          )}

          {newFilePreviews.length > 0 && (
            <div style={{ marginTop: "14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--admin-primary)", marginBottom: "8px" }}>
                {newFilePreviews.length} new photograph{newFilePreviews.length === 1 ? "" : "s"} ready to upload on save:
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {newFilePreviews.map((preview, i) => (
                  <div key={i} style={{ width: "70px", height: "70px", borderRadius: "6px", overflow: "hidden", border: "2px dashed var(--admin-primary)", background: "var(--admin-surface)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`Upload ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Optional Product Demonstration Video */}
        <div style={{ marginTop: "20px", borderTop: "1px solid var(--admin-border)", paddingTop: "20px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700 }}>Upload product demonstration video (optional)</span>
            <input
              name="product_video"
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleVideoChange}
            />
          </label>
          <p className={styles.fieldHelp} style={{ marginTop: "6px" }}>
            MP4 recommended (WebM supported). Up to 20 MB. Recommended duration 15–30 seconds.
          </p>

          {videoError && (
            <p style={{ color: "var(--admin-danger)", fontSize: "12px", marginTop: "6px" }}>
              {videoError}
            </p>
          )}

          {videoPreview && (
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--admin-primary)", margin: 0 }}>
                Video preview (ready to upload on save):
              </p>
              <video
                src={videoPreview}
                controls
                style={{ width: "100%", maxWidth: "320px", maxHeight: "180px", borderRadius: "6px", background: "#000" }}
              />
            </div>
          )}
        </div>
      </fieldset>

      {uploadError || state.error ? (
        <p className={styles.formError} role="alert">
          {uploadError || state.error}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <Link href="/admin/products" className={styles.secondaryButton}>
          Cancel
        </Link>
        <button className={styles.primaryButton} type="submit" disabled={pending || uploadingMedia}>
          {uploadingMedia ? "Uploading media…" : pending ? "Saving product…" : product ? "Save changes" : "Save product"}
        </button>
      </div>
    </form>
  );
}
