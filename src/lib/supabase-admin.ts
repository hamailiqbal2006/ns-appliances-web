import "server-only";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const ACCESS_COOKIE = "ns-admin-access";
const MAX_SESSION_AGE = 60 * 60;

type SupabaseConfig = {
  url: string;
  key: string;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
};

import {
  type ProductAvailability,
  resolveAvailabilityStatus,
} from "./product-availability";

export type { ProductAvailability };

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  subcategory_slug: string;
  description: string | null;
  specifications: Record<string, string>;
  price_pkr: number | null;
  stock_quantity: number | null;
  availability_status?: ProductAvailability | null;
  status: "draft" | "active" | "archived";
  image_path: string | null;
  created_at: string;
  updated_at: string;
  brand?: string | null;
  model_number?: string | null;
};

export type StoreSettings = {
  store_name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  publish_contact_details?: boolean;
};

type HomepageBannerSlot = string;

export type InquiryStatus = "new" | "reviewed" | "resolved";

export type AdminInquiry = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  subject: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
};

export type CustomerLeadStatus = "none" | "invited" | "added" | "opted_out";

export type AdminCustomerLead = {
  id: string;
  whatsapp_number: string;
  marketing_consent: boolean;
  consent_at: string | null;
  consent_version: string | null;
  marketing_status: CustomerLeadStatus;
  opted_out_at: string | null;
  created_at: string;
};

type SupabaseUser = { id: string; email?: string };

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

async function supabaseFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Admin backend is not configured.");

  const headers = new Headers(init.headers);
  headers.set("apikey", config.key);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${config.url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function currentAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

async function getAuthenticatedUser(): Promise<SupabaseUser | null> {
  const accessToken = await currentAccessToken();
  if (!accessToken || !getSupabaseConfig()) return null;

  const response = await supabaseFetch("/auth/v1/user", {}, accessToken);
  if (!response.ok) return null;
  return (await response.json()) as SupabaseUser;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const accessToken = await currentAccessToken();
  const user = await getAuthenticatedUser();
  if (!accessToken || !user) return null;

  const query = new URLSearchParams({
    select: "id,email,full_name,role",
    id: `eq.${user.id}`,
    role: "eq.admin",
    limit: "1",
  });
  const response = await supabaseFetch(`/rest/v1/profiles?${query}`, {}, accessToken);
  if (!response.ok) return null;

  const profiles = (await response.json()) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
  }>;
  const profile = profiles[0];
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email ?? user.email ?? "",
    fullName: profile.full_name,
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireAdminForAction() {
  await verifySameOrigin();
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Your session is no longer authorized. Please sign in again.");
  const accessToken = await currentAccessToken();
  if (!accessToken) throw new Error("Your session is no longer authorized. Please sign in again.");
  return { admin, accessToken };
}

export async function signInWithPassword(email: string, password: string) {
  await verifySameOrigin();
  const config = getSupabaseConfig();
  if (!config) return { error: "Admin setup is not complete yet." };

  const response = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) return { error: "We could not sign you in with those details." };
  const session = (await response.json()) as {
    access_token?: string;
  };
  if (!session.access_token) {
    return { error: "The sign-in service returned an incomplete session." };
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_SESSION_AGE,
  });
  return { error: null };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const { accessToken } = await requireAdminForRead();
  const baseSelect =
    "id,slug,name,category_slug,subcategory_slug,description,specifications,price_pkr,stock_quantity,status,image_path,created_at,updated_at";
  const enhancedSelect = `${baseSelect},availability_status`;

  let response = await supabaseFetch(
    `/rest/v1/products?${new URLSearchParams({
      select: enhancedSelect,
      order: "updated_at.desc",
    })}`,
    {},
    accessToken,
  );

  if (!response.ok) {
    response = await supabaseFetch(
      `/rest/v1/products?${new URLSearchParams({
        select: baseSelect,
        order: "updated_at.desc",
      })}`,
      {},
      accessToken,
    );
  }

  if (!response.ok) throw new Error("Could not load products from Supabase.");
  const rows = (await response.json()) as AdminProduct[];
  return rows.map((p) => ({
    ...p,
    availability_status: resolveAvailabilityStatus(p),
  }));
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const { accessToken } = await requireAdminForRead();
  const baseSelect =
    "id,slug,name,category_slug,subcategory_slug,description,specifications,price_pkr,stock_quantity,status,image_path,created_at,updated_at";
  const enhancedSelect = `${baseSelect},availability_status`;

  let response = await supabaseFetch(
    `/rest/v1/products?${new URLSearchParams({
      select: enhancedSelect,
      id: `eq.${id}`,
      limit: "1",
    })}`,
    {},
    accessToken,
  );

  if (!response.ok) {
    response = await supabaseFetch(
      `/rest/v1/products?${new URLSearchParams({
        select: baseSelect,
        id: `eq.${id}`,
        limit: "1",
      })}`,
      {},
      accessToken,
    );
  }

  if (!response.ok) throw new Error("Could not load that product from Supabase.");
  const rows = (await response.json()) as AdminProduct[];
  const found = rows[0] ?? null;
  if (!found) return null;
  return {
    ...found,
    availability_status: resolveAvailabilityStatus(found),
  };
}

export async function getAdminOverview() {
  const { accessToken } = await requireAdminForRead();
  const [productsResponse, inquiriesResponse, newInquiriesResponse, leadsResponse] = await Promise.all([
    countRows("products", accessToken),
    countRows("contact_inquiries", accessToken).catch(() => null),
    countRows("contact_inquiries", accessToken, { status: "eq.new" }).catch(() => null),
    countRows("customer_leads", accessToken).catch(() => null),
  ]);
  if (!productsResponse.ok) {
    throw new Error("Could not load store counts from Supabase.");
  }
  return {
    productCount: countResponse(productsResponse),
    inquiryCount: inquiriesResponse?.ok ? countResponse(inquiriesResponse) : 0,
    newInquiryCount: newInquiriesResponse?.ok ? countResponse(newInquiriesResponse) : 0,
    customerLeadCount: leadsResponse?.ok ? countResponse(leadsResponse) : 0,
  };
}

export async function getAdminInquiries(status?: InquiryStatus) {
  const { accessToken } = await requireAdminForRead();
  const query = new URLSearchParams({
    select: "id,customer_name,customer_email,customer_phone,subject,message,status,created_at,updated_at",
    order: "created_at.desc",
    limit: "100",
  });
  if (status) query.set("status", `eq.${status}`);
  try {
    const response = await supabaseFetch(`/rest/v1/contact_inquiries?${query}`, {}, accessToken);
    if (!response.ok) return [];
    return (await response.json()) as AdminInquiry[];
  } catch {
    return [];
  }
}

/** Distinguishes an empty inbox from an unapplied contact-inquiry migration. */
export async function isAdminInquiriesReady() {
  try {
    const { accessToken } = await requireAdminForRead();
    const response = await supabaseFetch("/rest/v1/contact_inquiries?select=id&limit=1", {}, accessToken);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAdminInquiry(id: string) {
  const { accessToken } = await requireAdminForRead();
  const query = new URLSearchParams({
    select: "id,customer_name,customer_email,customer_phone,subject,message,status,created_at,updated_at",
    id: `eq.${id}`,
    limit: "1",
  });
  try {
    const response = await supabaseFetch(`/rest/v1/contact_inquiries?${query}`, {}, accessToken);
    if (!response.ok) return null;
    return ((await response.json()) as AdminInquiry[])[0] ?? null;
  } catch {
    return null;
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { accessToken } = await requireAdminForRead();
  const query = new URLSearchParams({
    select: "store_name,phone,email,whatsapp,address,hours,publish_contact_details",
    id: "eq.true",
    limit: "1",
  });
  const response = await supabaseFetch(`/rest/v1/store_settings?${query}`, {}, accessToken);
  if (!response.ok) throw new Error("Could not load store settings from Supabase.");
  const settings = ((await response.json()) as StoreSettings[])[0];
  return {
    store_name: settings?.store_name || "NS Home Appliances",
    phone: settings?.phone ?? null,
    email: settings?.email ?? null,
    whatsapp: settings?.whatsapp ?? null,
    address: settings?.address ?? null,
    hours: settings?.hours ?? null,
    publish_contact_details: Boolean(settings?.publish_contact_details),
  };
}

/** Public reads are restricted by a dedicated opt-in RLS policy. */
export async function getPublicStoreSettings(): Promise<StoreSettings | null> {
  if (!getSupabaseConfig()) return null;

  const query = new URLSearchParams({
    select: "store_name,phone,email,whatsapp,address,hours,publish_contact_details",
    id: "eq.true",
    limit: "1",
  });
  try {
    const response = await supabaseFetch(`/rest/v1/store_settings?${query}`);
    if (!response.ok) return null;
    const settings = ((await response.json()) as StoreSettings[])[0];
    return settings?.publish_contact_details ? settings : null;
  } catch {
    return null;
  }
}

export async function saveStoreSettings(settings: StoreSettings, accessToken: string) {
  const payload = {
    id: true,
    store_name: settings.store_name,
    phone: settings.phone,
    email: settings.email,
    whatsapp: settings.whatsapp,
    address: settings.address,
    hours: settings.hours,
    publish_contact_details: true,
  };
  const response = await supabaseFetch("/rest/v1/store_settings?on_conflict=id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  }, accessToken);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Could not save store settings: ${errText}`);
  }
}

export async function saveAdminProduct(
  product: Omit<AdminProduct, "id" | "created_at" | "updated_at" | "image_path"> & {
    image_path?: string | null;
    brand?: string | null;
    model_number?: string | null;
    availability_status?: ProductAvailability | null;
  },
  accessToken: string,
  id?: string,
) {
  const chosenAvailability = product.availability_status || "not_confirmed";

  // Ensure specifications always mirrors availability_status and out_of_stock intent for zero-downtime resilience
  const enhancedSpecifications: Record<string, string> = {
    ...(product.specifications || {}),
    availability_status: chosenAvailability,
  };
  if (chosenAvailability === "out_of_stock") {
    enhancedSpecifications.out_of_stock = "true";
  } else {
    delete enhancedSpecifications.out_of_stock;
    delete enhancedSpecifications.explicit_zero_stock;
  }

  const payload = {
    ...product,
    specifications: enhancedSpecifications,
    availability_status: chosenAvailability,
    updated_at: new Date().toISOString(),
  };

  let response = await supabaseFetch(
    id ? `/rest/v1/products?id=eq.${encodeURIComponent(id)}` : "/rest/v1/products",
    {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(payload),
    },
    accessToken,
  );

  if (!response.ok) {
    const errorText = await response.text();
    // If optional columns or not-null constraints fail before migration, retry safely
    if (
      errorText.includes("brand") ||
      errorText.includes("model_number") ||
      errorText.includes("availability_status") ||
      errorText.includes("column") ||
      errorText.includes("not-null")
    ) {
      const corePayload = { ...payload };
      delete (corePayload as Record<string, unknown>).brand;
      delete (corePayload as Record<string, unknown>).model_number;
      delete (corePayload as Record<string, unknown>).availability_status;

      // If database still requires an integer stock_quantity (not null):
      if (corePayload.stock_quantity === null || corePayload.stock_quantity === undefined) {
        corePayload.stock_quantity = 0;
      }

      response = await supabaseFetch(
        id ? `/rest/v1/products?id=eq.${encodeURIComponent(id)}` : "/rest/v1/products",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify(corePayload),
        },
        accessToken,
      );
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not save the product.");
    }
  }

  const saved = ((await response.json()) as AdminProduct[])[0];
  return {
    ...saved,
    availability_status: resolveAvailabilityStatus(saved),
  };
}


export async function updateAdminInquiryStatus(id: string, status: InquiryStatus, accessToken: string) {
  const response = await supabaseFetch(`/rest/v1/contact_inquiries?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  }, accessToken);
  if (!response.ok) throw new Error("Could not update the inquiry status.");
}

export async function deleteAdminInquiry(id: string, accessToken: string) {
  const response = await supabaseFetch(`/rest/v1/contact_inquiries?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, accessToken);
  if (!response.ok) throw new Error("Could not delete the inquiry.");
}

/** Count through the same RLS-protected REST surface as the admin tables. */
async function countRows(
  table: "products" | "contact_inquiries" | "customer_leads",
  accessToken: string,
  filters: Record<string, string> = {},
) {
  const query = new URLSearchParams({ select: "id", ...filters });
  return supabaseFetch(`/rest/v1/${table}?${query}`, {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  }, accessToken);
}

function countResponse(response: Response) {
  const total = response.headers.get("content-range")?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

export type ProductDeletionOutcome = {
  success: boolean;
  action: "deleted" | "failed";
  message?: string;
  error?: string;
};

export async function deleteProductImagesFromStorage(paths: string[], accessToken: string) {
  if (!paths || paths.length === 0) return true;
  const config = getSupabaseConfig();
  if (!config) return false;

  try {
    const response = await supabaseFetch("/storage/v1/object/product-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: paths }),
    }, accessToken);

    if (!response.ok) {
      console.warn("[deleteProductImagesFromStorage] Storage delete returned status:", response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[deleteProductImagesFromStorage] Storage cleanup error:", err);
    return false;
  }
}

/**
 * A storage path may have been reused by an older import or manual edit. Check
 * both catalog image references after the product row is gone before deleting
 * the object; an unreadable reference check is intentionally treated as shared.
 */
async function findUnreferencedProductStoragePaths(paths: string[], accessToken: string) {
  const unreferenced: string[] = [];
  let couldVerifyEveryPath = true;

  for (const path of paths) {
    try {
      const [galleryResponse, productResponse] = await Promise.all([
        supabaseFetch(
          `/rest/v1/product_images?storage_path=eq.${encodeURIComponent(path)}&select=id&limit=1`,
          {},
          accessToken,
        ),
        supabaseFetch(
          `/rest/v1/products?image_path=eq.${encodeURIComponent(path)}&select=id&limit=1`,
          {},
          accessToken,
        ),
      ]);

      if (!galleryResponse.ok || !productResponse.ok) {
        couldVerifyEveryPath = false;
        continue;
      }

      const [galleryRows, productRows] = (await Promise.all([
        galleryResponse.json(),
        productResponse.json(),
      ])) as [Array<{ id: string }>, Array<{ id: string }>];

      if (galleryRows.length === 0 && productRows.length === 0) {
        unreferenced.push(path);
      }
    } catch (err) {
      console.warn("[deleteAdminProduct] Could not verify shared storage path:", err);
      couldVerifyEveryPath = false;
    }
  }

  return { unreferenced, couldVerifyEveryPath };
}

export async function deleteAdminProduct(id: string, accessToken: string): Promise<ProductDeletionOutcome> {
  if (!id || typeof id !== "string") {
    return { success: false, action: "failed", error: "A valid product identifier is required." };
  }

  // 1. Verify existence and retrieve media references
  const productRes = await supabaseFetch(
    `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id,name,image_path,status&limit=1`,
    {},
    accessToken
  );
  if (!productRes.ok) {
    const err = await productRes.json().catch(() => null);
    console.error("[deleteAdminProduct] Query failed:", productRes.status, err?.code, err?.message);
    return { success: false, action: "failed", error: "Failed to verify product record." };
  }
  const products = (await productRes.json()) as Array<{ id: string; name: string; image_path: string | null; status: string }>;
  const product = products[0];
  if (!product) {
    return { success: false, action: "failed", error: "Product not found." };
  }

  // 2. Gather associated media paths before deletion. The rows themselves are
  // database-cascaded; file cleanup is deliberately deferred until the DELETE
  // is confirmed so a failed deletion can never leave broken media references.
  let galleryPaths: string[] = [];
  try {
    const galleryRes = await supabaseFetch(
      `/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=storage_path`,
      {},
      accessToken
    );
    if (galleryRes.ok) {
      const rows = (await galleryRes.json()) as Array<{ storage_path: string }>;
      galleryPaths = rows.map((r) => r.storage_path).filter(Boolean);
    }
  } catch (e) {
    console.warn("[deleteAdminProduct] Gallery lookup error:", e);
  }
  const storagePathsToDelete = Array.from(
    new Set([product.image_path, ...galleryPaths].filter((p): p is string => Boolean(p))),
  );

  // 3. The migration 20261101_product_deletion_preserve_reservation_history
  // snapshots linked reservations and changes their FK to SET NULL. This makes
  // the catalog DELETE atomic without removing customer history.
  const deleteRes = await supabaseFetch(
    `/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: { Prefer: "return=representation" } },
    accessToken
  );

  if (!deleteRes.ok) {
    const err = await deleteRes.json().catch(() => null);
    console.error("[deleteAdminProduct] Database deletion failed:", {
      status: deleteRes.status,
      code: err?.code,
      message: err?.message,
      details: err?.details,
    });
    if (err?.code === "23503") {
      return {
        success: false,
        action: "failed",
        error: "This product is linked to protected history. Apply the reservation-preserving deletion migration before retrying.",
      };
    }
    return {
      success: false,
      action: "failed",
      error: "Product deletion failed. Please try again.",
    };
  }

  const deletedRows = (await deleteRes.json().catch(() => [])) as Array<{ id: string }>;
  if (!deletedRows.some((row) => row.id === id)) {
    return {
      success: false,
      action: "failed",
      error: "The product was not deleted. Refresh the page and try again.",
    };
  }

  // 4. Database deletion is confirmed. Remove only objects that are no longer
  // referenced by any remaining product or gallery row.
  const cleanup = await findUnreferencedProductStoragePaths(storagePathsToDelete, accessToken);
  const storageRemoved = await deleteProductImagesFromStorage(cleanup.unreferenced, accessToken);
  if (!cleanup.couldVerifyEveryPath || !storageRemoved) {
    return {
      success: true,
      action: "deleted",
      message: `Product "${product.name}" permanently deleted. Some unused media files were retained because their references could not be verified.`,
    };
  }

  return {
    success: true,
    action: "deleted",
    message: `Product "${product.name}" permanently deleted.`,
  };
}

export async function deleteAdminProductsBulk(
  ids: string[],
  accessToken: string
): Promise<{
  success: boolean;
  total: number;
  deletedCount: number;
  failedCount: number;
  results: Array<{ id: string; name?: string; success: boolean; action?: "deleted" | "failed"; error?: string; message?: string }>;
}> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))).slice(0, 50);
  const results = [];
  let deletedCount = 0;
  let failedCount = 0;

  for (const id of uniqueIds) {
    const outcome = await deleteAdminProduct(id, accessToken);
    results.push({ id, ...outcome });
    if (outcome.action === "deleted") deletedCount++;
    else failedCount++;
  }

  return {
    success: failedCount === 0,
    total: uniqueIds.length,
    deletedCount,
    failedCount,
    results,
  };
}

export async function uploadProductImage(file: File, productId: string, accessToken: string) {
  const validImage = await validateImage(file);
  if (!validImage.ok) throw new Error(validImage.error);
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const response = await supabaseFetch(`/storage/v1/object/product-images/${path}`, {
    method: "POST",
    headers: { "Content-Type": file.type, "x-upsert": "false" },
    body: file,
  }, accessToken);
  if (!response.ok) throw new Error(await storageUploadError(response, "image"));
  return path;
}

export type DirectProductMediaKind = "image" | "video";

export async function createProductMediaUploadUrl(
  input: { uploadId: string; fileName: string; contentType: string; size: number; kind: DirectProductMediaKind },
  accessToken: string,
) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Admin backend is not configured.");

  if (!/^[0-9a-f-]{36}$/i.test(input.uploadId)) throw new Error("Invalid product media upload session.");
  const acceptedTypes = input.kind === "image"
    ? ["image/jpeg", "image/png", "image/webp"]
    : ["video/mp4", "video/webm"];
  const limit = input.kind === "image" ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
  if (!acceptedTypes.includes(input.contentType)) {
    throw new Error(input.kind === "image" ? "Use a JPEG, PNG, or WebP image." : "Use an MP4 or WebM video.");
  }
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > limit) {
    throw new Error(input.kind === "image" ? "Images must be 5 MB or smaller." : "Videos must be 20 MB or smaller.");
  }

  const extension = input.contentType === "image/png" ? "png"
    : input.contentType === "image/webp" ? "webp"
    : input.contentType === "video/webm" ? "webm"
    : input.contentType === "video/mp4" ? "mp4"
    : "jpg";
  const path = `${input.uploadId}/${crypto.randomUUID()}.${extension}`;
  const response = await supabaseFetch(`/storage/v1/object/upload/sign/product-images/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "false" },
  }, accessToken);
  if (!response.ok) throw new Error(await storageUploadError(response, "product media"));

  const payload = await response.json().catch(() => null) as { url?: string } | null;
  if (!payload?.url) throw new Error("Supabase Storage did not provide an upload URL. Please retry.");
  return { path, uploadUrl: new URL(payload.url, config.url).toString() };
}

async function storageUploadError(response: Response, label: string) {
  const payload = await response.json().catch(() => null) as { statusCode?: string; code?: string; message?: string } | null;
  const providerMessage = payload?.message?.trim();

  if (response.status === 401) return "Your administrator session has expired. Sign in again, then retry the upload.";
  if (response.status === 403) return "Your account is signed in but is not permitted to upload product media. Check the product-images Storage policy for approved admins.";
  if (response.status === 413) return `${label[0].toUpperCase()}${label.slice(1)} is too large for the upload service. Use a smaller file and try again.`;
  if (response.status === 415) return `This ${label} format is not accepted by the product-images bucket.`;
  if (response.status >= 500) return `Supabase Storage is temporarily unavailable (HTTP ${response.status}). Please retry in a moment.`;
  return providerMessage
    ? `Supabase Storage rejected this ${label} (HTTP ${response.status}: ${providerMessage}).`
    : `Supabase Storage rejected this ${label} (HTTP ${response.status}).`;
}

export async function uploadProductVideo(file: File, productId: string, accessToken: string) {
  if (!["video/mp4", "video/webm"].includes(file.type)) {
    throw new Error("Only MP4 and WebM video formats are supported.");
  }
  const maxVideoSize = 20 * 1024 * 1024; // 20 MB limit
  if (file.size > maxVideoSize) {
    throw new Error("Video file exceeds the 20 MB maximum size limit.");
  }
  const extension = file.type === "video/webm" ? "webm" : "mp4";
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const response = await supabaseFetch(`/storage/v1/object/product-images/${path}`, {
    method: "POST",
    headers: { "Content-Type": file.type, "x-upsert": "false" },
    body: file,
  }, accessToken);
  if (!response.ok) throw new Error("The video could not be uploaded to storage.");
  return path;
}

export async function assertHomepageBannersReady(accessToken: string) {
  const response = await supabaseFetch("/rest/v1/homepage_banners?select=slot_key&limit=3", {}, accessToken);
  if (!response.ok) {
    throw new Error(
      "Homepage banner setup is incomplete. Apply supabase/migrations/20261029_homepage_banners.sql before changing the three banner slots.",
    );
  }
}

export async function assertAnnouncementBarReady(accessToken: string) {
  const response = await supabaseFetch(
    "/rest/v1/announcement_bar_settings?select=singleton,theme,separator,speed&singleton=eq.true&limit=1",
    {},
    accessToken,
  );
  if (!response.ok) {
    const baseResponse = await supabaseFetch(
      "/rest/v1/announcement_bar_settings?select=singleton&singleton=eq.true&limit=1",
      {},
      accessToken,
    );
    if (!baseResponse.ok) {
      throw new Error(
        "Announcement bar setup is incomplete. Apply supabase/migrations/20261029_announcement_bar.sql in your Supabase SQL Editor before changing homepage announcements.",
      );
    }
    throw new Error(
      "Announcement customization columns are missing. Apply supabase/migrations/20261029_announcement_bar_customization.sql in your Supabase SQL Editor before saving theme or motion settings.",
    );
  }
}

export async function saveAnnouncementBar(
  enabled: boolean,
  messages: Array<{ id: string | null; message: string; is_active: boolean; sort_order: number }>,
  customization: {
    theme: string;
    separator: string;
    speed: string;
  },
  accessToken: string,
) {
  const rpcResponse = await supabaseFetch("/rest/v1/rpc/update_announcement_bar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_enabled: enabled,
      p_messages: messages,
      p_theme: customization.theme,
      p_separator: customization.separator,
      p_speed: customization.speed,
    }),
  }, accessToken);

  if (rpcResponse.ok) return;

  const errorText = await rpcResponse.text();
  let errorMessage = "Could not save the announcement bar configuration.";
  try {
    const parsed = JSON.parse(errorText);
    if (parsed && typeof parsed.message === "string") {
      if (parsed.code === "PGRST202" || parsed.message.includes("update_announcement_bar")) {
        errorMessage =
          "The announcement bar database schema is outdated. Please run supabase/migrations/20261029_announcement_bar_customization.sql in your Supabase SQL Editor to save themes, speeds, and separators.";
      } else {
        errorMessage = parsed.message;
      }
    }
  } catch {
    // Keep default errorMessage if non-JSON
  }

  throw new Error(errorMessage);
}

export async function uploadHomepageBannerImage(
  file: File,
  slot: HomepageBannerSlot,
  accessToken: string,
  kind: "desktop" | "mobile" = "desktop",
) {
  const validImage = await validateBannerImage(file, kind);
  if (!validImage.ok) throw new Error(validImage.error);
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const prefix = kind === "mobile" ? "m-" : "";
  const path = `${slot}/${prefix}${crypto.randomUUID()}.${extension}`;
  const response = await supabaseFetch(`/storage/v1/object/homepage-banners/${path}`, {
    method: "POST",
    headers: { "Content-Type": file.type, "x-upsert": "false" },
    body: file,
  }, accessToken);
  if (!response.ok) throw new Error(`The ${kind} banner image could not be uploaded.`);
  return path;
}

export async function saveHomepageSliderSettings(
  bannerCount: number,
  intervalSeconds: number,
  accessToken: string,
) {
  const count = Math.max(1, Math.min(bannerCount, 10));
  const interval = Math.max(2, Math.min(intervalSeconds, 30));

  const response = await supabaseFetch(
    "/rest/v1/homepage_banner_settings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        singleton: true,
        banner_count: count,
        interval_seconds: interval,
      }),
    },
    accessToken,
  );

  if (response.ok) return;

  const errorText = await response.text();
  let errorMessage = "Could not save homepage slider settings.";
  try {
    const parsed = JSON.parse(errorText);
    if (parsed && typeof parsed.message === "string") {
      if (parsed.code === "PGRST205" || parsed.message.includes("homepage_banner_settings")) {
        errorMessage =
          "The slider settings table is not configured. Please run supabase/migrations/20261106_homepage_slider_settings.sql in your Supabase SQL Editor.";
      } else {
        errorMessage = parsed.message;
      }
    }
  } catch {
    if (errorText) errorMessage = errorText;
  }
  throw new Error(errorMessage);
}

export async function saveHomepageBanners(
  slots: Array<{
    slot_key: HomepageBannerSlot;
    sort_order: number;
    image_path: string | null;
    mobile_image_path?: string | null;
  }>,
  accessToken: string,
) {
  let response = await supabaseFetch("/rest/v1/rpc/update_homepage_banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_slots: slots }),
  }, accessToken);

  // Resilient fallback if the database has not yet been upgraded with the mobile_image_path migration
  if (!response.ok) {
    const fallbackSlots = slots.map(({ slot_key, sort_order, image_path }) => ({
      slot_key,
      sort_order,
      image_path,
    }));
    response = await supabaseFetch("/rest/v1/rpc/update_homepage_banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_slots: fallbackSlots }),
    }, accessToken);
  }

  if (!response.ok) throw new Error("Could not save the homepage banner configuration.");
}

export async function deleteHomepageBannerImage(path: string, accessToken: string) {
  const response = await supabaseFetch("/storage/v1/object/homepage-banners", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  }, accessToken);
  if (!response.ok) throw new Error("The previous banner file could not be removed from storage.");
}

export function productImageUrl(path: string | null) {
  if (!getSupabaseConfig() || !path) return null;
  // Media is served through the app so Storage RLS can protect inactive product
  // files while still allowing active product images to render publicly.
  return `/api/product-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export async function getProductImages(productId: string, accessToken: string) {
  const config = getSupabaseConfig();
  if (!config) return [];

  try {
    const query = new URLSearchParams({
      select: "id,product_id,storage_path,alt_text,sort_order,is_primary,media_type",
      product_id: `eq.${productId}`,
      order: "sort_order.asc",
    });
    const response = await supabaseFetch(`/rest/v1/product_images?${query}`, {}, accessToken);
    if (!response.ok) return [];
    return (await response.json()) as Array<{
      id: string;
      product_id: string;
      storage_path: string;
      alt_text: string | null;
      sort_order: number;
      is_primary: boolean;
      media_type: "image" | "video";
    }>;
  } catch {
    return [];
  }
}

export async function assertProductGalleryReady(accessToken: string) {
  const response = await supabaseFetch("/rest/v1/product_images?select=id&limit=1", {}, accessToken);
  if (!response.ok) {
    throw new Error(
      "Product gallery setup is incomplete. Apply the product gallery migration before uploading, changing, or removing media.",
    );
  }
}

export async function saveProductImages(
  productId: string,
  images: Array<{
    id?: string;
    storage_path: string;
    alt_text?: string | null;
    sort_order: number;
    is_primary: boolean;
    media_type?: "image" | "video";
  }>,
  accessToken: string,
) {
  const config = getSupabaseConfig();
  if (!config) return;

  const removeResponse = await supabaseFetch(`/rest/v1/product_images?product_id=eq.${encodeURIComponent(productId)}`, {
      method: "DELETE",
  }, accessToken);
  if (!removeResponse.ok) {
    throw new Error("Could not update the product gallery.");
  }

  if (images.length === 0) return;

  const rows = images.map((img, idx) => {
    const isVideo = img.media_type === "video" || /\.(mp4|webm)$/i.test(img.storage_path);
    return {
      product_id: productId,
      storage_path: img.storage_path,
      alt_text: img.alt_text || null,
      sort_order: img.sort_order ?? idx,
      is_primary: isVideo ? false : img.is_primary,
      media_type: isVideo ? "video" : "image",
      updated_at: new Date().toISOString(),
    };
  });

  const insertResponse = await supabaseFetch("/rest/v1/product_images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  }, accessToken);
  if (!insertResponse.ok) {
    throw new Error("Could not save the product gallery.");
  }
}

const inquiryAttempts = new Map<string, number[]>();

function acceptInquiryAttempt(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(address).digest("hex");
  const now = Date.now();
  const recent = (inquiryAttempts.get(key) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 5) {
    throw new Error("You have submitted multiple inquiries recently. Please wait a while before sending another.");
  }
  recent.push(now);
  inquiryAttempts.set(key, recent);
}

export async function submitContactInquiry(input: {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  subject?: string | null;
  message: string;
}) {
  const requestHeaders = await headers();
  await verifySameOrigin();
  acceptInquiryAttempt(requestHeaders);

  const payload = {
    p_customer_name: input.customerName.trim(),
    p_customer_email: input.customerEmail?.trim().toLowerCase() || null,
    p_customer_phone: input.customerPhone?.trim() || null,
    p_subject: input.subject?.trim() || null,
    p_message: input.message.trim(),
  };

  const response = await supabaseFetch("/rest/v1/rpc/submit_contact_inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.ok) return;

  const errorText = await response.text();

  // If RPC is not found, fallback to direct insert on contact_inquiries table
  if (response.status === 404 || errorText.includes("submit_contact_inquiry") || errorText.includes("function")) {
    const directResponse = await supabaseFetch("/rest/v1/contact_inquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        customer_name: payload.p_customer_name,
        customer_email: payload.p_customer_email,
        customer_phone: payload.p_customer_phone,
        subject: payload.p_subject,
        message: payload.p_message,
        status: "new",
      }),
    });

    if (directResponse.ok) return;
    const directError = await directResponse.text();
    let directMessage = "";
    try {
      const parsed = JSON.parse(directError);
      if (parsed && typeof parsed.message === "string") directMessage = parsed.message;
    } catch {
      // not JSON
    }
    if (directMessage) throw new Error(directMessage);
    throw new Error("Your inquiry could not be submitted. Please verify the contact_inquiries table migration has been applied.");
  }

  let responseMessage = "";
  try {
    const parsed = JSON.parse(errorText);
    if (parsed && typeof parsed.message === "string") responseMessage = parsed.message;
  } catch {
    // not JSON
  }
  if (responseMessage) throw new Error(responseMessage);
  throw new Error("Your inquiry could not be submitted. Please try again later.");
}

async function requireAdminForRead() {
  const admin = await requireAdmin();
  const accessToken = await currentAccessToken();
  if (!accessToken) throw new Error("Your session is no longer authorized. Please sign in again.");
  return { admin, accessToken };
}

export async function getAdminAccessTokenForRead() {
  return (await requireAdminForRead()).accessToken;
}

export async function getAdminCustomerLeads(search = ""): Promise<{ leads: AdminCustomerLead[]; isReady: boolean }> {
  const { accessToken } = await requireAdminForRead();
  try {
    const query = new URLSearchParams({
      select: "id,whatsapp_number,marketing_consent,consent_at,consent_version,marketing_status,opted_out_at,created_at",
      order: "created_at.desc",
      limit: "500",
    });
    const response = await supabaseFetch(`/rest/v1/customer_leads?${query}`, {}, accessToken);
    if (!response.ok) return { leads: [], isReady: false };
    const leads = (await response.json()) as AdminCustomerLead[];
    const term = search.trim().replace(/[^0-9+]/g, "");
    return {
      leads: term ? leads.filter((lead) => lead.whatsapp_number.replace(/[^0-9+]/g, "").includes(term)) : leads,
      isReady: true,
    };
  } catch {
    return { leads: [], isReady: false };
  }
}

export async function assertWelcomePopupReady(accessToken: string) {
  const response = await supabaseFetch(
    "/rest/v1/welcome_popup_settings?select=singleton&singleton=eq.true&limit=1",
    {},
    accessToken,
  );
  if (!response.ok) {
    throw new Error("Welcome offer setup is incomplete. Apply supabase/migrations/20261030_welcome_popup_leads.sql, then reload this page.");
  }
}

export async function saveWelcomePopupSettings(
  settings: {
    enabled: boolean;
    eyebrow: string;
    headline: string;
    description: string;
    offerText: string | null;
    buttonLabel: string;
    imagePath: string | null;
    imageAlt: string;
    displayDelaySeconds: number;
  },
  accessToken: string,
) {
  const response = await supabaseFetch("/rest/v1/rpc/update_welcome_popup_settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_enabled: settings.enabled,
      p_eyebrow: settings.eyebrow,
      p_headline: settings.headline,
      p_description: settings.description,
      p_offer_text: settings.offerText,
      p_button_label: settings.buttonLabel,
      p_image_path: settings.imagePath,
      p_image_alt: settings.imageAlt,
      p_display_delay_seconds: settings.displayDelaySeconds,
    }),
  }, accessToken);
  if (!response.ok) throw new Error("Could not save the welcome offer settings.");
}

export async function uploadWelcomePopupImage(file: File, accessToken: string) {
  const validImage = await validateImage(file);
  if (!validImage.ok) throw new Error(validImage.error);
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `welcome/${crypto.randomUUID()}.${extension}`;
  const response = await supabaseFetch(`/storage/v1/object/welcome-popup-media/${path}`, {
    method: "POST",
    headers: { "Content-Type": file.type, "x-upsert": "false" },
    body: file,
  }, accessToken);
  if (!response.ok) throw new Error("The welcome-offer image could not be uploaded.");
  return path;
}

export async function deleteWelcomePopupImage(path: string, accessToken: string) {
  const response = await supabaseFetch("/storage/v1/object/welcome-popup-media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  }, accessToken);
  if (!response.ok) throw new Error("The previous welcome-offer image could not be removed.");
}

export async function updateAdminCustomerLeadStatus(id: string, status: CustomerLeadStatus, accessToken: string) {
  const requiresMarketingConsent = status === "invited" || status === "added";
  const consentFilter = requiresMarketingConsent ? "&marketing_consent=is.true" : "";
  const response = await supabaseFetch(`/rest/v1/customer_leads?id=eq.${encodeURIComponent(id)}${consentFilter}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      marketing_status: status,
      marketing_consent: status === "opted_out" ? false : undefined,
      opted_out_at: status === "opted_out" ? new Date().toISOString() : null,
    }),
  }, accessToken);
  if (!response.ok) throw new Error("Could not update this customer lead.");
  const updatedLeads = (await response.json()) as Array<{ id: string }>;
  return updatedLeads.length > 0
    ? "updated"
    : requiresMarketingConsent
      ? "consent_required"
      : "not_found";
}

export type CustomerLeadDeletionOutcome = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function deleteAdminCustomerLead(
  id: string,
  accessToken: string
): Promise<CustomerLeadDeletionOutcome> {
  if (!id || typeof id !== "string") {
    return { success: false, error: "A valid customer contact identifier is required." };
  }

  // Safely delete any associated customer tokens if table exists
  try {
    await supabaseFetch(
      `/rest/v1/customer_tokens?customer_lead_id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE" },
      accessToken
    );
  } catch {
    // customer_tokens table may not exist or has cascade; continue cleanly
  }

  const response = await supabaseFetch(
    `/rest/v1/customer_leads?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" },
    accessToken
  );

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    console.error("[deleteAdminCustomerLead] Deletion failed:", {
      status: response.status,
      code: err?.code,
      message: err?.message,
    });
    return {
      success: false,
      error: "Could not delete this customer contact. Please try again.",
    };
  }

  return {
    success: true,
    message: "Customer contact deleted successfully.",
  };
}

export async function deleteAdminCustomerLeadsBulk(
  ids: string[],
  accessToken: string
): Promise<{
  success: boolean;
  total: number;
  deletedCount: number;
  failedCount: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))).slice(0, 100);
  const results = [];
  let deletedCount = 0;
  let failedCount = 0;

  for (const id of uniqueIds) {
    const outcome = await deleteAdminCustomerLead(id, accessToken);
    results.push({ id, success: outcome.success, error: outcome.error });
    if (outcome.success) deletedCount++;
    else failedCount++;
  }

  return {
    success: failedCount === 0,
    total: uniqueIds.length,
    deletedCount,
    failedCount,
    results,
  };
}

async function validateImage(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file.size) return { ok: false, error: "Choose an image before uploading." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Images must be 5 MB or smaller." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  const isWebp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return isJpeg || isPng || isWebp
    ? { ok: true }
    : { ok: false, error: "The uploaded file does not appear to be a valid image." };
}

function dimensionsFromImage(bytes: Uint8Array, mime: string): { width: number; height: number } | null {
  const read16 = (at: number) => (bytes[at] << 8) | bytes[at + 1];
  const read32 = (at: number) => (bytes[at] * 2 ** 24) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];

  if (mime === "image/png" && bytes.length >= 24) return { width: read32(16), height: read32(20) };

  if (mime === "image/jpeg") {
    let index = 2;
    while (index + 9 < bytes.length) {
      if (bytes[index] !== 0xff) { index += 1; continue; }
      while (bytes[index] === 0xff) index += 1;
      const marker = bytes[index++];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
      const length = read16(index);
      if (length < 2 || index + length > bytes.length) return null;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { width: read16(index + 5), height: read16(index + 3) };
      }
      index += length;
    }
  }

  if (mime === "image/webp" && bytes.length >= 30) {
    const chunk = new TextDecoder().decode(bytes.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === "VP8L" && bytes.length >= 26 && bytes[20] === 0x2f) return { width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8), height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10) };
    if (chunk === "VP8 " && bytes.length >= 34) return { width: read16(30) & 0x3fff, height: read16(32) & 0x3fff };
  }
  return null;
}

async function validateBannerImage(
  file: File,
  kind: "desktop" | "mobile" = "desktop",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const basic = await validateImage(file);
  if (!basic.ok) return basic;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = dimensionsFromImage(bytes, file.type);
  if (!dimensions || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height)) {
    return { ok: false, error: "The banner image dimensions could not be verified." };
  }
  if (kind === "mobile") {
    if (dimensions.width < 540 || dimensions.height < 540 || dimensions.width > 6000 || dimensions.height > 6000) {
      return {
        ok: false,
        error: "Mobile banner images must be between 540 × 540 and 6000 × 6000 pixels (recommended: 1080 × 1920, 9:16 aspect ratio).",
      };
    }
  } else {
    if (dimensions.width < 960 || dimensions.height < 540 || dimensions.width > 6000 || dimensions.height > 6000) {
      return {
        ok: false,
        error: "Desktop banner images must be between 960 × 540 and 6000 × 6000 pixels (recommended: 1920 × 1080, 16:9 aspect ratio).",
      };
    }
  }
  return { ok: true };
}

export async function verifySameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ?? "http";

  if (!origin || !host || !["http", "https"].includes(forwardedProtocol)) {
    throw new Error("This request was rejected for security reasons.");
  }

  try {
    const expectedOrigin = new URL(`${forwardedProtocol}://${host}`).origin;
    if (new URL(origin).origin !== expectedOrigin) {
      throw new Error("This request was rejected for security reasons.");
    }
  } catch {
    throw new Error("This request was rejected for security reasons.");
  }
}
