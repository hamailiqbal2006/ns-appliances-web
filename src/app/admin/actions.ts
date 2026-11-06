"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteAdminProduct,
  deleteAdminProductsBulk,
  type ProductDeletionOutcome,
  getCurrentAdmin,
  requireAdminForAction,
  saveAdminProduct,
  saveStoreSettings,
  signInWithPassword,
  signOut,
  assertProductGalleryReady,
  assertHomepageBannersReady,
  assertAnnouncementBarReady,
  deleteHomepageBannerImage,
  saveHomepageBanners,
  saveAnnouncementBar,
  uploadHomepageBannerImage,
  uploadProductImage,
  uploadProductVideo,
  deleteAdminCustomerLead,
  deleteAdminCustomerLeadsBulk,
  type CustomerLeadDeletionOutcome,
  updateAdminCustomerLeadStatus,
  type CustomerLeadStatus,
} from "@/lib/supabase-admin";
import { getAdminHomepageBanners } from "@/lib/homepage-banners";
import {
  getAdminAnnouncementBar,
  sanitizeTheme,
  sanitizeSeparator,
  sanitizeSpeed,
} from "@/lib/announcement-bar";
import {
  deleteAdminCategory,
  EDITORIAL_GROUPS,
  saveAdminCategory,
  type EditorialGroup,
  type SubcategoryItem,
} from "@/lib/categories";

export type FormState = { error: string | null; success?: boolean };

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: FormDataEntryValue | null, label: string, maxLength: number) {
  const result = text(value);
  if (result.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return result || null;
}

function safeNextPath(value: string) {
  try {
    // Browsers normalize both encoded slashes and backslashes in a Location
    // header, so validate the decoded path rather than the raw form value.
    const normalized = decodeURIComponent(value).replace(/\\/g, "/");
    return normalized.startsWith("/") && !normalized.startsWith("//") ? value : "/admin";
  } catch {
    return "/admin";
  }
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  if (!email || !password) return { error: "Enter your email address and password." };

  const result = await signInWithPassword(email, password);
  if (result.error) return { error: result.error };

  const admin = await getCurrentAdmin();
  if (!admin) {
    await signOut();
    return { error: "This account is not approved for the NS admin portal." };
  }

  redirect(safeNextPath(text(formData.get("next"))));
}

export async function logoutAction() {
  await requireAdminForAction();
  await signOut();
  redirect("/admin/login");
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function specificationsFromText(value: string) {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 1) return null;
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry?.[0] && entry[1]));
  return Object.fromEntries(entries);
}

import {
  type ProductAvailability,
} from "@/lib/product-availability";

function parseProduct(formData: FormData) {
  const name = text(formData.get("name"));
  const slug = cleanSlug(text(formData.get("slug")) || name);
  const categorySlug = text(formData.get("category"));
  const subcategorySlug = text(formData.get("subcategory")) || categorySlug;
  const brand = text(formData.get("brand"));
  const modelNumber = text(formData.get("model_number"));
  const priceValue = text(formData.get("price_pkr"));
  const stockValue = text(formData.get("stock_quantity"));
  const rawAvailability = text(formData.get("availability_status"));
  const status = text(formData.get("status"));

  if (!name || name.length > 160) throw new Error("Enter a product name of up to 160 characters.");
  if (!slug) throw new Error("Enter a valid URL slug using letters, numbers, and hyphens.");
  if (!categorySlug) throw new Error("Choose a valid product category.");
  if (!["draft", "active", "archived"].includes(status)) throw new Error("Choose a valid product status.");

  const price = priceValue ? Number(priceValue) : null;
  let stock: number | null = null;
  if (stockValue !== null && stockValue !== undefined && stockValue.trim() !== "") {
    const parsedStock = Number(stockValue);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      throw new Error("Tracked stock quantity must be a non-negative integer (0 or greater).");
    }
    stock = parsedStock;
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    throw new Error("Price must be zero or greater.");
  }

  // Determine availability status based on explicit selection or stock tracking rules
  let availability: ProductAvailability = "not_confirmed";
  if (
    rawAvailability === "available" ||
    rawAvailability === "out_of_stock" ||
    rawAvailability === "not_confirmed"
  ) {
    availability = rawAvailability;
  } else if (stock !== null && stock > 0) {
    availability = "available";
  } else if (stock === 0) {
    availability = "out_of_stock";
  }

  const specifications = specificationsFromText(text(formData.get("specifications")));
  if (brand) specifications["Brand"] = brand;
  if (modelNumber) specifications["Model Number"] = modelNumber;
  specifications.availability_status = availability;

  if (availability === "out_of_stock") {
    specifications.out_of_stock = "true";
    if (stock === 0) specifications.explicit_zero_stock = "true";
  } else {
    delete specifications.out_of_stock;
    delete specifications.explicit_zero_stock;
  }

  return {
    slug,
    name,
    category_slug: categorySlug,
    subcategory_slug: subcategorySlug,
    brand: brand || null,
    model_number: modelNumber || null,
    description: text(formData.get("description")) || null,
    specifications,
    price_pkr: price,
    stock_quantity: stock,
    availability_status: availability,
    status: status as "draft" | "active" | "archived",
  };
}

import { saveProductImages } from "@/lib/supabase-admin";
import { updateAdminReviewStatus, deleteAdminReview } from "@/lib/reviews";

export async function saveProductAction(_: FormState, formData: FormData): Promise<FormState> {
  let savedProductId: string;

  try {
    const { accessToken } = await requireAdminForAction();
    const id = text(formData.get("id"));
    const uploadId = id || crypto.randomUUID();
    const product = parseProduct(formData);
    const newFiles = formData.getAll("new_images");
    const videoFile = formData.get("product_video");
    const singleImage = formData.get("image");

    // Parse existing or manipulated gallery items from form JSON
    const galleryItemsRaw = text(formData.get("gallery_items"));
    let galleryItems: Array<{
      storage_path: string;
      alt_text?: string | null;
      sort_order: number;
      is_primary: boolean;
      media_type?: "image" | "video";
    }> = [];

    if (galleryItemsRaw) {
      try {
        const parsed = JSON.parse(galleryItemsRaw);
        if (!Array.isArray(parsed)) throw new Error("Invalid gallery data.");
        galleryItems = parsed.filter(
          (item): item is (typeof galleryItems)[number] =>
            typeof item?.storage_path === "string" &&
            typeof item?.sort_order === "number" &&
            typeof item?.is_primary === "boolean",
        );
      } catch {
        galleryItems = [];
      }
    }

    const hasNewMedia =
      newFiles.some((file) => file instanceof File && file.size > 0) ||
      (videoFile instanceof File && videoFile.size > 0) ||
      (singleImage instanceof File && singleImage.size > 0);
    const needsGallerySync =
      galleryItems.length > 0 ||
      text(formData.get("has_existing_gallery")) === "true" ||
      hasNewMedia;

    // Check the schema before writing the product or uploading files. This
    // avoids a partial save when a deployment has not yet applied its gallery
    // migration.
    if (needsGallerySync) await assertProductGalleryReady(accessToken);

    // Process new images (can be multiple files)
    for (const file of newFiles) {
      if (file instanceof File && file.size > 0) {
        const path = await uploadProductImage(file, uploadId, accessToken);
        galleryItems.push({
          storage_path: path,
          alt_text: product.name,
          sort_order: galleryItems.length,
          is_primary: galleryItems.length === 0,
          media_type: "image",
        });
      }
    }

    // Process optional product video upload
    if (videoFile instanceof File && videoFile.size > 0) {
      if (galleryItems.some((item) => item.media_type === "video" || /\.(mp4|webm)$/i.test(item.storage_path))) {
        throw new Error("Keep one demonstration video per product. Remove the existing video before uploading another.");
      }
      const videoPath = await uploadProductVideo(videoFile, uploadId, accessToken);
      galleryItems.push({
        storage_path: videoPath,
        alt_text: `${product.name} product demonstration video`,
        sort_order: galleryItems.length,
        is_primary: false, // Videos are never primary cover
        media_type: "video",
      });
    }

    // Legacy single image input fallback
    if (singleImage instanceof File && singleImage.size > 0) {
      const path = await uploadProductImage(singleImage, uploadId, accessToken);
      galleryItems.push({
        storage_path: path,
        alt_text: product.name,
        sort_order: galleryItems.length,
        is_primary: galleryItems.length === 0,
        media_type: "image",
      });
    }

    // Ensure videos are never marked primary, and at least one image is primary if images exist
    for (const item of galleryItems) {
      if (/\.(mp4|webm)$/i.test(item.storage_path)) {
        item.is_primary = false;
      }
    }
    const imageItems = galleryItems.filter((item) => !/\.(mp4|webm)$/i.test(item.storage_path));
    if (imageItems.length > 0 && !imageItems.some((item) => item.is_primary)) {
      imageItems[0].is_primary = true;
    }

    // Determine primary cover image for products.image_path (used on catalog cards)
    const primaryItem = imageItems.find((item) => item.is_primary) || imageItems[0];
    const imagePath = primaryItem?.storage_path || text(formData.get("existing_image_path")) || null;

    const saved = await saveAdminProduct({ ...product, image_path: imagePath }, accessToken, id || undefined);
    savedProductId = saved.id;

    // Save gallery images in product_images table
    if (needsGallerySync) await saveProductImages(saved.id, galleryItems, accessToken);

    // The public catalog and every product gallery use these shared tags.
    // updateTag gives the editor read-your-own-writes consistency after save.
    updateTag("public-products");
    updateTag("categories");
    updateTag(`product-images-${savedProductId}`);
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/category/[category]", "page");
    revalidatePath("/category/[category]/[subcategory]", "page");
    revalidatePath("/");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The product could not be saved." };
  }

  // `redirect` deliberately interrupts rendering. Keep it outside the error
  // handler so Next.js can navigate after a successful save.
  redirect("/admin/products");
}

export async function moderateReviewAction(formData: FormData) {
  const { accessToken } = await requireAdminForAction();
  const id = text(formData.get("id"));
  const status = text(formData.get("status")) as "approved" | "rejected";
  if (!id || !["approved", "rejected"].includes(status)) {
    throw new Error("Invalid review moderation request.");
  }
  await updateAdminReviewStatus(id, status, accessToken);
  revalidatePath("/admin/reviews");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
}

export async function deleteReviewAction(formData: FormData) {
  const { accessToken } = await requireAdminForAction();
  const id = text(formData.get("id"));
  if (!id) throw new Error("A review identifier is required.");
  await deleteAdminReview(id, accessToken);
  revalidatePath("/admin/reviews");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
}

export async function deleteProductAction(formData: FormData) {
  const id = text(formData.get("id"));
  if (!id) throw new Error("A product identifier is required.");
  const { accessToken } = await requireAdminForAction();
  const outcome = await deleteAdminProduct(id, accessToken);
  if (!outcome.success) {
    throw new Error(outcome.error || "Could not delete the product.");
  }
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/category/[category]/[subcategory]", "page");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteSingleProductAction(id: string): Promise<ProductDeletionOutcome> {
  if (!id || typeof id !== "string") {
    return { success: false, action: "failed", error: "A product identifier is required." };
  }
  const { accessToken } = await requireAdminForAction();
  const outcome = await deleteAdminProduct(id, accessToken);
  if (outcome.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/category/[category]/[subcategory]", "page");
    revalidatePath("/");
  }
  return outcome;
}

export async function bulkDeleteProductsAction(productIds: string[]): Promise<{
  success: boolean;
  total: number;
  deletedCount: number;
  failedCount: number;
  results: Array<{ id: string; name?: string; success: boolean; action?: "deleted" | "failed"; error?: string; message?: string }>;
  error?: string;
}> {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return {
      success: false,
      total: 0,
      deletedCount: 0,
      failedCount: 0,
      results: [],
      error: "No products selected.",
    };
  }

  const { accessToken } = await requireAdminForAction();
  const outcome = await deleteAdminProductsBulk(productIds, accessToken);

  if (outcome.deletedCount > 0) {
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/category/[category]/[subcategory]", "page");
    revalidatePath("/");
  }

  return outcome;
}

/* Category Management Actions */

function parseSubcategories(raw: string): SubcategoryItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Format can be "Subcategory Name" or "Subcategory Name:slug"
      const parts = line.split(":");
      const name = parts[0].trim();
      const slug = cleanSlug(parts[1]?.trim() || name);
      return { name, slug };
    })
    .filter((sub) => sub.name.length > 0 && sub.slug.length > 0);
}

export async function saveCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { accessToken } = await requireAdminForAction();
    const id = text(formData.get("id")) || undefined;
    const name = text(formData.get("name"));
    const slug = cleanSlug(text(formData.get("slug")) || name);
    const editorialGroup = text(formData.get("editorial_group")) as EditorialGroup;
    const description = text(formData.get("description")) || null;
    const displayOrderValue = text(formData.get("display_order"));
    const displayOrder = displayOrderValue ? parseInt(displayOrderValue, 10) : 0;
    const isActive = formData.get("is_active") === "on";
    const subcategoriesRaw = text(formData.get("subcategories"));

    if (!name || name.length > 100) {
      return { error: "Enter a category name up to 100 characters." };
    }
    if (!slug) {
      return { error: "Enter a valid category URL slug." };
    }
    if (!EDITORIAL_GROUPS.some((g) => g.slug === editorialGroup)) {
      return { error: "Select a valid editorial presentation group (Cooling, Laundry, Kitchen & Everyday, Home)." };
    }

    const subcategories = parseSubcategories(subcategoriesRaw);

    await saveAdminCategory(
      {
        id,
        name,
        slug,
        description,
        editorial_group: editorialGroup,
        display_order: Number.isNaN(displayOrder) ? 0 : displayOrder,
        is_active: isActive,
        subcategories,
      },
      accessToken,
    );

    revalidatePath("/admin");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/new");
    revalidatePath("/products");
    revalidatePath("/");
    redirect("/admin/categories");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The category could not be saved." };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const id = text(formData.get("id"));
  const slug = text(formData.get("slug"));
  if (!id) throw new Error("A category identifier is required.");
  const { accessToken } = await requireAdminForAction();
  await deleteAdminCategory(id, slug, accessToken);
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function saveSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { accessToken } = await requireAdminForAction();
    const storeName = text(formData.get("store_name"));
    const email = text(formData.get("email"));
    const whatsapp = optionalText(formData.get("whatsapp"), "WhatsApp number", 60);
    const phone = optionalText(formData.get("phone"), "Phone number", 60);
    const address = optionalText(formData.get("address"), "Showroom address", 600);
    const hours = optionalText(formData.get("hours"), "Operating hours", 400);

    if (!storeName || storeName.length > 160) {
      return { error: "Enter a store name of up to 160 characters." };
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return { error: "Enter a valid store email address, or leave it blank." };
    }
    if (whatsapp && whatsapp.replace(/\D/g, "").length < 7) {
      return { error: "Enter a valid WhatsApp phone number (at least 7 digits), or leave it blank." };
    }

    await saveStoreSettings(
      {
        store_name: storeName,
        phone,
        email: email || null,
        whatsapp,
        address,
        hours,
        publish_contact_details: true,
      },
      accessToken,
    );
    revalidatePath("/admin/settings");
    revalidatePath("/contact");
    revalidatePath("/products");
    return { error: null, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Store settings could not be saved." };
  }
}

type BannerConfiguration = {
  slot_key: "brand" | "climate" | "utility";
  sort_order: number;
  remove_artwork?: boolean;
  remove_desktop_artwork?: boolean;
  remove_mobile_artwork?: boolean;
};

function parseBannerConfiguration(value: string): BannerConfiguration[] {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("The homepage banner configuration is invalid."); }
  if (!Array.isArray(parsed) || parsed.length !== 3) throw new Error("Exactly three homepage banner slots are required.");
  const slots = new Set(["brand", "climate", "utility"]);
  const orders = new Set<number>();
  for (const item of parsed) {
    if (
      !item ||
      !slots.has(item.slot_key) ||
      !Number.isInteger(item.sort_order) ||
      item.sort_order < 0 ||
      item.sort_order > 2
    ) {
      throw new Error("The homepage banner configuration is invalid.");
    }
    if (orders.has(item.sort_order)) throw new Error("Each homepage banner must have a different rotation position.");
    orders.add(item.sort_order);
  }
  if (new Set(parsed.map((item) => item.slot_key)).size !== 3) throw new Error("Each homepage banner slot must appear once.");
  return parsed as BannerConfiguration[];
}

export async function saveHomepageBannersAction(_: FormState, formData: FormData): Promise<FormState> {
  const uploadedPaths: string[] = [];
  try {
    const { accessToken } = await requireAdminForAction();
    await assertHomepageBannersReady(accessToken);
    const current = await getAdminHomepageBanners(accessToken);
    if (!current.isReady) throw new Error("Homepage banner setup is incomplete. Apply the banner migration, then reload this page.");
    const changes = parseBannerConfiguration(text(formData.get("banner_configuration")));
    const existing = new Map(current.banners.map((banner) => [banner.id, banner]));
    const next = [] as Array<{
      slot_key: "brand" | "climate" | "utility";
      sort_order: number;
      image_path: string | null;
      mobile_image_path: string | null;
    }>;
    const pathsToRemove: string[] = [];

    for (const change of changes) {
      const previous = existing.get(change.slot_key);
      if (!previous) throw new Error("The homepage banner configuration is incomplete.");

      // 1. Desktop Image
      const removeDesktop = change.remove_desktop_artwork ?? change.remove_artwork ?? false;
      const desktopFile = formData.get(`banner_desktop_${change.slot_key}`) || formData.get(`banner_${change.slot_key}`);
      let imagePath = removeDesktop ? null : previous.imagePath;
      if (!removeDesktop && desktopFile instanceof File && desktopFile.size > 0) {
        imagePath = await uploadHomepageBannerImage(desktopFile, change.slot_key, accessToken, "desktop");
        uploadedPaths.push(imagePath);
      }
      if (previous.imagePath && previous.imagePath !== imagePath) {
        pathsToRemove.push(previous.imagePath);
      }

      // 2. Mobile Image
      const removeMobile = change.remove_mobile_artwork ?? false;
      const mobileFile = formData.get(`banner_mobile_${change.slot_key}`);
      let mobileImagePath = removeMobile ? null : previous.mobileImagePath;
      if (!removeMobile && mobileFile instanceof File && mobileFile.size > 0) {
        mobileImagePath = await uploadHomepageBannerImage(mobileFile, change.slot_key, accessToken, "mobile");
        uploadedPaths.push(mobileImagePath);
      }
      if (previous.mobileImagePath && previous.mobileImagePath !== mobileImagePath) {
        pathsToRemove.push(previous.mobileImagePath);
      }

      next.push({
        slot_key: change.slot_key,
        sort_order: change.sort_order,
        image_path: imagePath,
        mobile_image_path: mobileImagePath,
      });
    }

    await saveHomepageBanners(next, accessToken);
    // The database now points at the new artwork (or fallback); old objects are
    // cleaned up afterwards so a storage cleanup issue cannot break the hero.
    await Promise.all(pathsToRemove.map((path) => deleteHomepageBannerImage(path, accessToken).catch(() => undefined)));
    updateTag("homepage-banners");
    revalidatePath("/");
    revalidatePath("/admin/banners");
    return { error: null, success: true };
  } catch (error) {
    const accessToken = await (async () => {
      try { return (await requireAdminForAction()).accessToken; } catch { return null; }
    })();
    if (accessToken) await Promise.all(uploadedPaths.map((path) => deleteHomepageBannerImage(path, accessToken).catch(() => undefined)));
    return { error: error instanceof Error ? error.message : "The homepage banners could not be saved." };
  }
}

type AnnouncementConfiguration = {
  id: string | null;
  message: string;
  is_active: boolean;
  sort_order: number;
};

function parseAnnouncementConfiguration(value: string): AnnouncementConfiguration[] {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("The announcement configuration is invalid."); }
  if (!Array.isArray(parsed) || parsed.length > 50) throw new Error("You can save up to 50 announcements.");
  const orders = new Set<number>();
  const ids = new Set<string>();
  const entries: AnnouncementConfiguration[] = [];
  for (const item of parsed) {
    if (!item || typeof item.message !== "string" || typeof item.is_active !== "boolean" || !Number.isInteger(item.sort_order) || item.sort_order < 0 || item.sort_order > 49) {
      throw new Error("The announcement configuration is invalid.");
    }
    const message = item.message.trim();
    if (!message || message.length > 120) throw new Error("Each announcement must be between 1 and 120 characters.");
    const id = typeof item.id === "string" && item.id ? item.id : null;
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error("The announcement configuration is invalid.");
    }
    if (orders.has(item.sort_order) || (id && ids.has(id))) throw new Error("Announcement order and IDs must be unique.");
    orders.add(item.sort_order);
    if (id) ids.add(id);
    entries.push({ id, message, is_active: item.is_active, sort_order: item.sort_order });
  }
  return entries;
}

export async function saveAnnouncementBarAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { accessToken } = await requireAdminForAction();
    await assertAnnouncementBarReady(accessToken);
    const current = await getAdminAnnouncementBar(accessToken);
    if (!current.isReady) throw new Error("Announcement bar setup is incomplete. Apply the announcement migration, then reload this page.");
    if (!current.hasCustomizationColumns) {
      throw new Error(
        "Database migration required: Please apply supabase/migrations/20261029_announcement_bar_customization.sql in your Supabase SQL Editor before saving theme or motion customization.",
      );
    }
    const theme = sanitizeTheme(formData.get("announcement_bar_theme"));
    const separator = sanitizeSeparator(formData.get("announcement_bar_separator"));
    const speed = sanitizeSpeed(formData.get("announcement_bar_speed"));
    const messages = parseAnnouncementConfiguration(text(formData.get("announcement_configuration")));
    await saveAnnouncementBar(
      formData.get("announcement_bar_enabled") === "on",
      messages,
      { theme, separator, speed },
      accessToken,
    );
    updateTag("announcement-bar");
    revalidatePath("/");
    revalidatePath("/admin/announcement-bar");
    return { error: null, success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The announcement bar could not be saved." };
  }
}

export async function saveWelcomePopupAction(): Promise<FormState> {
  return { error: "The Welcome Offer feature is currently retired." };
}

export async function updateCustomerLeadStatusAction(formData: FormData) {
  const id = text(formData.get("id"));
  const status = text(formData.get("status"));
  if (!id || !["none", "invited", "added", "opted_out"].includes(status)) throw new Error("Choose a valid customer status.");
  const { accessToken } = await requireAdminForAction();
  const result = await updateAdminCustomerLeadStatus(id, status as CustomerLeadStatus, accessToken);
  if (result !== "updated") throw new Error("This customer lead could no longer be updated.");
  revalidatePath("/admin/customers");
}

export async function saveCustomerLeadStatusAction(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData.get("id"));
  const status = text(formData.get("status"));
  if (!id || !["none", "invited", "added"].includes(status)) {
    return { error: "Choose a valid customer status." };
  }

  try {
    const { accessToken } = await requireAdminForAction();
    const result = await updateAdminCustomerLeadStatus(id, status as CustomerLeadStatus, accessToken);
    if (result === "consent_required") {
      return { error: "This contact has not opted in to marketing, so it cannot be marked as invited or added." };
    }
    if (result !== "updated") return { error: "This customer lead is no longer available to update." };
    revalidatePath("/admin/customers");
    return { error: null, success: true };
  } catch {
    return { error: "The customer status could not be saved. Please refresh and try again." };
  }
}

export async function deleteCustomerLeadAction(formData: FormData) {
  const id = text(formData.get("id"));
  if (!id) throw new Error("A customer lead identifier is required.");
  const { accessToken } = await requireAdminForAction();
  const outcome = await deleteAdminCustomerLead(id, accessToken);
  if (!outcome.success) {
    throw new Error(outcome.error || "Could not delete this customer contact.");
  }
  revalidatePath("/admin/customers");
}

export async function deleteSingleCustomerLeadAction(id: string): Promise<CustomerLeadDeletionOutcome> {
  if (!id || typeof id !== "string") {
    return { success: false, error: "A customer lead identifier is required." };
  }
  const { accessToken } = await requireAdminForAction();
  const outcome = await deleteAdminCustomerLead(id, accessToken);
  if (outcome.success) {
    revalidatePath("/admin/customers");
  }
  return outcome;
}

export async function bulkDeleteCustomerLeadsAction(leadIds: string[]): Promise<{
  success: boolean;
  total: number;
  deletedCount: number;
  failedCount: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
  error?: string;
}> {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return {
      success: false,
      total: 0,
      deletedCount: 0,
      failedCount: 0,
      results: [],
      error: "No customer contacts selected.",
    };
  }

  const { accessToken } = await requireAdminForAction();
  const outcome = await deleteAdminCustomerLeadsBulk(leadIds, accessToken);

  if (outcome.deletedCount > 0) {
    revalidatePath("/admin/customers");
  }

  return outcome;
}
