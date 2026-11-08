/* eslint-disable @next/next/no-img-element */
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
  file?: File;
  isNew?: boolean;
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

  // Gallery items state (with Drag-and-Drop and Move Earlier / Later support)
  const [gallery, setGallery] = useState<AdminGalleryItem[]>(() => {
    if (initialGallery && initialGallery.length > 0) {
      // Ensure at least one non-video image is marked primary
      const hasPrimary = initialGallery.some((g) => g.isPrimary && g.mediaType !== "video");
      if (!hasPrimary) {
        const firstImg = initialGallery.find((g) => g.mediaType !== "video");
        if (firstImg) firstImg.isPrimary = true;
      }
      return initialGallery.map((item, idx) => ({ ...item, sortOrder: idx }));
    }
    if (product?.image_path && imageUrl) {
      return [
        {
          id: `initial-cover`,
          storagePath: product.image_path,
          url: imageUrl,
          altText: product.name,
          isPrimary: true,
          sortOrder: 0,
          mediaType: "image",
        },
      ];
    }
    return [];
  });

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  // Drag and drop reordering
  const handleReorder = (fromIndex: number, toIndex: number) => {
    setGallery((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  // Keyboard / Touch earlier and later buttons
  const handleMoveImage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < gallery.length) {
      handleReorder(index, targetIndex);
    }
  };

  // Set primary image
  const handleMakePrimary = (index: number) => {
    setGallery((prev) => {
      const target = prev[index];
      const isVideo =
        target.mediaType === "video" ||
        /\.(mp4|webm)$/i.test(target.storagePath || target.url);
      if (isVideo) return prev; // Video can never be primary

      return prev.map((item, idx) => ({
        ...item,
        isPrimary: idx === index,
      }));
    });
  };

  // Remove gallery item
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

  // Multi-image selection (integrated directly into gallery state with pre-upload reordering)
  const handleMultiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    setAspectRatioWarning(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setImageError(`File ${file.name} exceeds 5 MB. Please choose smaller images.`);
        e.target.value = "";
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setImageError(`File ${file.name} is not JPEG, PNG, or WebP.`);
        e.target.value = "";
        return;
      }
      validFiles.push(file);
    }

    setGallery((prev) => {
      const currentLength = prev.length;
      const hasPrimary = prev.some((item) => item.isPrimary && item.mediaType !== "video");
      const newItems: AdminGalleryItem[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const previewUrl = URL.createObjectURL(file);
        const isFirst = !hasPrimary && i === 0;

        newItems.push({
          id: `new-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          storagePath: "",
          url: previewUrl,
          altText: `${product?.name || "Product"} showroom view`,
          isPrimary: isFirst,
          sortOrder: currentLength + i,
          mediaType: "image",
          file,
          isNew: true,
        });

        // Non-blocking aspect ratio inspection
        const img = new window.Image();
        img.src = previewUrl;
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

      return [...prev, ...newItems].map((item, idx) => ({ ...item, sortOrder: idx }));
    });

    e.target.value = "";
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
    if (!transfer.ok) {
      const detail = (await transfer.json().catch(() => null)) as { message?: string } | null;
      throw new Error(detail?.message || `Supabase Storage rejected the ${kind} (HTTP ${transfer.status}).`);
    }
    return { path: ticketData.path, kind };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || uploadingMedia) return;

    setUploadingMedia(true);
    setUploadError(null);

    try {
      const formEl = event.currentTarget;
      const currentGallery = [...gallery];
      const pendingUploads = currentGallery.filter((item) => item.isNew && item.file);

      // Direct upload any newly added images before committing form state
      for (const item of pendingUploads) {
        if (item.file) {
          const uploaded = await uploadFileDirectly(item.file, item.mediaType || "image");
          item.storagePath = uploaded.path;
          item.isNew = false;
        }
      }

      // Check optional video upload
      const videoInput = formEl.elements.namedItem("product_video") as HTMLInputElement | null;
      const videoFile = videoInput?.files?.[0];
      if (videoFile && videoFile.size > 0) {
        const uploadedVideo = await uploadFileDirectly(videoFile, "video");
        currentGallery.push({
          id: `video-${Date.now()}`,
          storagePath: uploadedVideo.path,
          url: "",
          altText: `${product?.name || "Product"} demonstration video`,
          isPrimary: false,
          sortOrder: currentGallery.length,
          mediaType: "video",
        });
      }

      // Ensure exactly one primary image is selected if images exist
      const imageItems = currentGallery.filter(
        (item) => item.mediaType !== "video" && !/\.(mp4|webm)$/i.test(item.storagePath || item.url),
      );
      if (imageItems.length > 0 && !imageItems.some((item) => item.isPrimary)) {
        imageItems[0].isPrimary = true;
      }

      // Update state
      setGallery(currentGallery);

      // Prepare FormData for the Server Action
      const formData = new FormData(formEl);
      formData.delete("new_images");
      formData.delete("product_video");

      // Serialize gallery_items with exact sequence & primary indicator
      const serializedItems = currentGallery
        .filter((item) => Boolean(item.storagePath))
        .map((g, idx) => ({
          storage_path: g.storagePath,
          alt_text: g.altText || "",
          is_primary: g.isPrimary,
          sort_order: idx,
          media_type: g.mediaType || (/\.(mp4|webm)$/i.test(g.storagePath || g.url) ? "video" : "image"),
        }));

      formData.set("gallery_items", JSON.stringify(serializedItems));
      formData.set("has_existing_gallery", serializedItems.length > 0 ? "true" : "false");

      const primaryCover = serializedItems.find((g) => g.is_primary && g.media_type !== "video") || serializedItems[0];
      formData.set("existing_image_path", primaryCover?.storage_path || product?.image_path || "");

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

      {/* 1. Identification & Categorization */}
      <fieldset>
        <legend>Product Identification</legend>
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
              disabled={availableSubcategories.length === 0}
            >
              <option value="">No subcategory</option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory.slug} value={subcategory.slug}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {/* 2. Brand, Model & Descriptions */}
      <fieldset>
        <legend>Brand & Narrative</legend>
        <div className={styles.fieldGrid}>
          <label>
            Brand
            <input
              name="brand"
              defaultValue={initialBrand}
              placeholder="e.g. Super Asia, Haier, Dawlance, Boss"
            />
          </label>

          <label>
            Model number
            <input
              name="model_number"
              defaultValue={initialModel}
              placeholder="e.g. ECM-5000-PLUS"
            />
          </label>

          <label className={styles.fieldWide}>
            Product description
            <textarea
              name="description"
              rows={4}
              defaultValue={product?.description ?? ""}
              placeholder="Comprehensive appliance summary for the storefront details page."
            />
          </label>

          <label className={styles.fieldWide}>
            Specifications
            <textarea
              name="specifications"
              rows={5}
              defaultValue={product?.specifications ? specificationsToText(product.specifications) : ""}
              placeholder="One specification per line (e.g. Cooling Capacity: 50 Litres)"
              aria-describedby="specs-help"
            />
            <span id="specs-help" className={styles.fieldHelp}>
              Format: &quot;Key: Value&quot; on each line. Brand and Model Number are managed above.
            </span>
          </label>
        </div>
      </fieldset>

      {/* 3. Pricing, Inventory & Availability */}
      <fieldset>
        <legend>Pricing & Inventory Status</legend>
        <div className={styles.fieldGrid}>
          <label>
            Price (PKR)
            <input
              name="price_pkr"
              type="number"
              min="0"
              step="500"
              defaultValue={product?.price_pkr ?? ""}
              placeholder="e.g. 35000"
              aria-describedby="price-help"
            />
            <span id="price-help" className={styles.fieldHelp}>
              Leave blank to display &quot;Price on inquiry&quot;.
            </span>
          </label>

          <label>
            Stock quantity (Units)
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              value={stockQuantity}
              onChange={(e) => {
                const val = e.target.value;
                setStockQuantity(val);
                if (val !== "" && Number(val) > 0) {
                  setAvailability("available");
                } else if (val === "0") {
                  setAvailability("out_of_stock");
                }
              }}
              placeholder="e.g. 5"
              aria-describedby="stock-help"
            />
            <span id="stock-help" className={styles.fieldHelp}>
              Numeric count of physical appliances in showroom.
            </span>
          </label>

          <label className={styles.fieldWide}>
            Commercial availability status
            <select
              name="availability_status"
              value={availability}
              onChange={(e) => {
                const newStatus = e.target.value as ProductAvailability;
                setAvailability(newStatus);
                if (newStatus === "out_of_stock" && stockQuantity !== "0") {
                  setStockQuantity("0");
                } else if (newStatus === "available" && (!stockQuantity || stockQuantity === "0")) {
                  setStockQuantity("1");
                }
              }}
            >
              <option value="available">Available in Showroom (Confirmed stock)</option>
              <option value="not_confirmed">Availability Not Confirmed (Untracked)</option>
              <option value="out_of_stock">Out of Stock (Currently unavailable)</option>
            </select>
          </label>
        </div>
      </fieldset>

      {/* 4. Product Media Gallery & Persistent Image Ordering */}
      <fieldset>
        <legend>Product Media Gallery</legend>
        <p className={styles.fieldHelp} style={{ marginBottom: "16px" }}>
          Reorder gallery photographs using drag-and-drop or the <strong>Earlier / Later</strong> buttons. Click <strong>Set as Primary</strong> to designate which photograph appears as the showroom cover across all catalog cards and category previews.
        </p>

        {gallery.length > 0 ? (
          <div className={styles.galleryManager}>
            <div className={styles.galleryGrid}>
              {gallery.map((item, idx) => {
                const isVideo =
                  item.mediaType === "video" ||
                  /\.(mp4|webm)$/i.test(item.storagePath || item.url);

                return (
                  <div
                    key={item.id || item.storagePath || item.url || idx}
                    className={`${styles.galleryCard} ${
                      item.isPrimary ? styles.galleryCardPrimary : ""
                    } ${draggedIdx === idx ? styles.galleryCardDragging : ""} ${
                      dragOverIdx === idx ? styles.galleryCardDragOver : ""
                    }`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(idx));
                      setDraggedIdx(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverIdx !== idx) setDragOverIdx(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIdx === idx) setDragOverIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        handleReorder(draggedIdx, idx);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                  >
                    <div className={styles.galleryMediaPreview}>
                      <span className={styles.galleryOrderBadge}>
                        #{idx + 1}
                      </span>

                      {item.isPrimary && !isVideo && (
                        <span className={styles.galleryPrimaryBadge}>
                          ★ Primary
                        </span>
                      )}

                      {isVideo && (
                        <span
                          className={styles.galleryPrimaryBadge}
                          style={{
                            backgroundColor: "#26323B",
                            color: "#E8DCC8",
                          }}
                        >
                          Video
                        </span>
                      )}

                      {item.isNew && (
                        <span className={styles.galleryPendingBadge}>
                          Ready to upload
                        </span>
                      )}

                      {isVideo ? (
                        <video
                          src={item.url}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            background: "#000",
                          }}
                          controls
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.altText || `Appliance photo ${idx + 1}`}
                          className={styles.galleryMediaImage}
                        />
                      )}
                    </div>

                    <div className={styles.galleryCardBody}>
                      <label style={{ display: "grid", gap: "4px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--admin-text-secondary)",
                          }}
                        >
                          {isVideo ? "Video description" : "Image alt text"}
                        </span>
                        <input
                          type="text"
                          className={styles.galleryAltInput}
                          value={item.altText}
                          onChange={(e) =>
                            handleAltTextChange(idx, e.target.value)
                          }
                          placeholder={
                            isVideo
                              ? "Demonstration video"
                              : "e.g. Front view, Control panel"
                          }
                        />
                      </label>

                      <div className={styles.galleryCardActions}>
                        {!item.isPrimary && !isVideo && (
                          <button
                            type="button"
                            className={`${styles.galleryActionButton} ${styles.galleryPrimaryButton}`}
                            onClick={() => handleMakePrimary(idx)}
                          >
                            Set as Primary
                          </button>
                        )}

                        <button
                          type="button"
                          className={styles.galleryActionButton}
                          onClick={() => handleMoveImage(idx, "up")}
                          disabled={idx === 0}
                          title="Move earlier in sequence"
                          aria-label={`Move image ${idx + 1} earlier`}
                        >
                          &larr; Earlier
                        </button>

                        <button
                          type="button"
                          className={styles.galleryActionButton}
                          onClick={() => handleMoveImage(idx, "down")}
                          disabled={idx === gallery.length - 1}
                          title="Move later in sequence"
                          aria-label={`Move image ${idx + 1} later`}
                        >
                          Later &rarr;
                        </button>

                        <button
                          type="button"
                          className={`${styles.galleryActionButton} ${styles.galleryRemoveButton}`}
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove from gallery"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "20px",
              background: "var(--admin-surface-muted)",
              borderRadius: "8px",
              border: "1px solid var(--admin-border)",
              color: "var(--admin-text-secondary)",
              fontSize: "13.5px",
              textAlign: "center",
              margin: "16px 0",
            }}
          >
            No photographs or media attached to this product yet. Add product photographs below.
          </div>
        )}

        {/* Upload Multiple Product Photographs */}
        <div
          style={{
            marginTop: "20px",
            borderTop: "1px solid var(--admin-border)",
            paddingTop: "20px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
              Add new product photographs
            </span>
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
            <p
              style={{
                color: "var(--admin-danger)",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              {imageError}
            </p>
          )}

          {aspectRatioWarning && (
            <div
              style={{
                background: "var(--admin-warning-bg)",
                border: "1px solid var(--admin-warning-border)",
                color: "var(--admin-text-primary)",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                marginTop: "8px",
              }}
            >
              {aspectRatioWarning}
            </div>
          )}
        </div>

        {/* Upload Optional Product Demonstration Video */}
        <div
          style={{
            marginTop: "20px",
            borderTop: "1px solid var(--admin-border)",
            paddingTop: "20px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
              Upload product demonstration video (optional)
            </span>
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
            <p
              style={{
                color: "var(--admin-danger)",
                fontSize: "12px",
                marginTop: "6px",
              }}
            >
              {videoError}
            </p>
          )}

          {videoPreview && (
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--admin-text-primary)",
                  margin: 0,
                }}
              >
                Video preview:
              </p>
              <video
                src={videoPreview}
                controls
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  maxHeight: "180px",
                  borderRadius: "6px",
                  background: "#000",
                }}
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* 5. Visibility & Publishing */}
      <fieldset>
        <legend>Storefront Visibility</legend>
        <input type="hidden" name="status" value={isActive ? "active" : "draft"} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "8px" }}>
          <div>
            <strong style={{ display: "block", fontSize: "13.5px", color: "var(--admin-text-primary)" }}>
              Publish on public website
            </strong>
            <span style={{ fontSize: "12.5px", color: "var(--admin-text-secondary)" }}>
              {isActive
                ? "This appliance is currently visible to customers in the catalog."
                : "This appliance is currently a hidden draft and will not appear in the catalog."}
            </span>
          </div>
          <AdminSwitch
            checked={isActive}
            onChange={(checked) => setIsActive(checked)}
            ariaLabel="Toggle storefront visibility"
          />
        </div>
      </fieldset>

      {uploadError || state.error ? (
        <p className={styles.formError} role="alert">
          {uploadError || state.error}
        </p>
      ) : null}

      {/* Exactly one primary Save Changes button with secondary Cancel link */}
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
