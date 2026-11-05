import "server-only";

import { getSupabaseConfig } from "@/lib/supabase-admin";
import type { PublicProductReview, AdminProductReview, ReviewStatus } from "@/lib/gallery-types";

/**
 * Fetches approved reviews for a public product.
 * Returns only approved reviews; private email addresses are never requested or exposed.
 */
export async function getApprovedReviews(productId: string): Promise<PublicProductReview[]> {
  const config = getSupabaseConfig();
  if (!config || !productId) return [];

  try {
    const query = new URLSearchParams({
      select: "id,product_id,customer_name,rating,review_text,created_at",
      product_id: `eq.${productId}`,
      status: "eq.approved",
      order: "created_at.desc",
      limit: "50",
    });

    const response = await fetch(`${config.url}/rest/v1/product_reviews?${query}`, {
      headers: { apikey: config.key },
      next: { revalidate: 60, tags: [`reviews-${productId}`] },
    });

    if (!response.ok) return [];
    const rows = (await response.json()) as Array<{
      id: string;
      product_id: string;
      customer_name: string;
      rating: number;
      review_text: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      customerName: row.customer_name,
      rating: row.rating,
      reviewText: row.review_text,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Submits a new customer review via narrow RPC or pending record.
 * Status is ALWAYS 'pending'.
 */
export async function submitProductReview(input: {
  productId: string;
  customerName: string;
  rating: number;
  reviewText: string;
  customerEmail?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, error: "Review service is currently unavailable." };
  }

  // 1. Validate inputs
  const name = input.customerName.trim();
  const text = input.reviewText.trim();
  const rating = Number(input.rating);
  const email = input.customerEmail?.trim().toLowerCase() || null;

  if (!name || name.length > 120) {
    return { ok: false, error: "Please enter your name (up to 120 characters)." };
  }
  if (!rating || rating < 1 || rating > 5) {
    return { ok: false, error: "Please select a star rating between 1 and 5." };
  }
  if (!text || text.length < 5 || text.length > 2000) {
    return { ok: false, error: "Review text must be between 5 and 2,000 characters." };
  }
  if (email && (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254)) {
    return { ok: false, error: "Please enter a valid email address or leave it blank." };
  }

  try {
    // Try calling the submit_product_review RPC first
    const rpcResponse = await fetch(`${config.url}/rest/v1/rpc/submit_product_review`, {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_product_id: input.productId,
        p_customer_name: name,
        p_rating: rating,
        p_review_text: text,
        p_customer_email: email,
      }),
    });

    if (rpcResponse.ok) {
      return { ok: true };
    }

    const errorBody = await rpcResponse.text();
    // If RPC doesn't exist, try direct insert with status pending
    if (rpcResponse.status === 404 || errorBody.includes("submit_product_review")) {
      const insertResponse = await fetch(`${config.url}/rest/v1/product_reviews`, {
        method: "POST",
        headers: {
          apikey: config.key,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          product_id: input.productId,
          customer_name: name,
          customer_email: email,
          rating,
          review_text: text,
          status: "pending",
        }),
      });

      if (insertResponse.ok) {
        return { ok: true };
      }
    }

    return {
      ok: false,
      error: "Could not submit review at this time. Please ensure migration 20261027_product_gallery_and_reviews.sql has been executed.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error submitting review.",
    };
  }
}

/**
 * Admin view: Fetch all reviews for moderation.
 */
export async function getAdminReviews(
  accessToken: string,
  status?: ReviewStatus,
): Promise<AdminProductReview[]> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) return [];

  try {
    const query = new URLSearchParams({
      select: "id,product_id,customer_name,customer_email,rating,review_text,status,created_at,updated_at",
      order: "created_at.desc",
      limit: "100",
    });
    if (status) query.set("status", `eq.${status}`);

    const [reviewsRes, productsRes] = await Promise.all([
      fetch(`${config.url}/rest/v1/product_reviews?${query}`, {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }),
      fetch(`${config.url}/rest/v1/products?select=id,name,slug`, {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }),
    ]);

    if (!reviewsRes.ok) return [];
    const rawReviews = (await reviewsRes.json()) as Array<{
      id: string;
      product_id: string;
      customer_name: string;
      customer_email: string | null;
      rating: number;
      review_text: string;
      status: ReviewStatus;
      created_at: string;
      updated_at: string;
    }>;

    const productMap = new Map<string, { name: string; slug: string }>();
    if (productsRes.ok) {
      const prods = (await productsRes.json()) as Array<{ id: string; name: string; slug: string }>;
      for (const p of prods) productMap.set(p.id, { name: p.name, slug: p.slug });
    }

    return rawReviews.map((r) => {
      const prod = productMap.get(r.product_id);
      return {
        id: r.id,
        productId: r.product_id,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        rating: r.rating,
        reviewText: r.review_text,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        productName: prod?.name,
        productSlug: prod?.slug,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Admin: Update review status (approve or reject).
 */
export async function updateAdminReviewStatus(
  id: string,
  status: "approved" | "rejected",
  accessToken: string,
): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");

  const response = await fetch(`${config.url}/rest/v1/product_reviews?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Could not update review status.");
  }
}

/**
 * Admin: Delete review.
 */
export async function deleteAdminReview(id: string, accessToken: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");

  const response = await fetch(`${config.url}/rest/v1/product_reviews?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Could not delete review.");
  }
}
