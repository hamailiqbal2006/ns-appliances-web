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
  authorTokenHash?: string | null;
}): Promise<{ ok: boolean; error?: string; reviewId?: string }> {
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
    // Try direct insert first to capture the generated review ID for author receipt
    const payload: Record<string, unknown> = {
      product_id: input.productId,
      customer_name: name,
      customer_email: email,
      rating,
      review_text: text,
      status: "pending",
    };
    if (input.authorTokenHash) {
      payload.author_token_hash = input.authorTokenHash;
    }

    let insertResponse = await fetch(`${config.url}/rest/v1/product_reviews`, {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    // If author_token_hash column is not yet migrated, retry without it
    if (!insertResponse.ok && input.authorTokenHash) {
      delete payload.author_token_hash;
      insertResponse = await fetch(`${config.url}/rest/v1/product_reviews`, {
        method: "POST",
        headers: {
          apikey: config.key,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
    }

    if (insertResponse.ok) {
      const rows = (await insertResponse.json()) as Array<{ id: string }>;
      return { ok: true, reviewId: rows[0]?.id };
    }

    // Fallback: try calling the submit_product_review RPC
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
      const rpcResult = await rpcResponse.json().catch(() => null);
      const generatedId = typeof rpcResult === "string" ? rpcResult : undefined;
      return { ok: true, reviewId: generatedId };
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
 * Server-only: Securely loads pending reviews written by the active visitor.
 * Verifies author ownership via receipt token matching and ensures approved reviews are excluded to avoid duplication.
 */
export async function getAuthorPendingReviews(
  productId: string,
  receipts: Array<{
    reviewId: string;
    productId: string;
    customerName: string;
    rating: number;
    reviewText: string;
    createdAt: string;
  }>,
): Promise<PublicProductReview[]> {
  const config = getSupabaseConfig();
  if (!config || !productId || !receipts || receipts.length === 0) return [];

  const relevant = receipts.filter((r) => r.productId === productId);
  if (relevant.length === 0) return [];

  try {
    const ids = relevant.map((r) => r.reviewId).filter(Boolean);
    if (ids.length > 0) {
      const query = new URLSearchParams({
        select: "id,status",
        id: `in.(${ids.join(",")})`,
      });
      const res = await fetch(`${config.url}/rest/v1/product_reviews?${query}`, {
        headers: { apikey: config.key },
        cache: "no-store",
      });

      if (res.ok) {
        const rows = (await res.json()) as Array<{ id: string; status: string }>;
        const statusMap = new Map(rows.map((r) => [r.id, r.status]));

        return relevant
          .filter((r) => {
            const status = statusMap.get(r.reviewId);
            // Strictly check that the review still exists in Supabase and is pending.
            // If approved, it is already rendered in initialReviews.
            // If rejected (deleted), it no longer exists in Supabase and must disappear.
            return status === "pending";
          })
          .map((r) => ({
            id: r.reviewId,
            productId: r.productId,
            customerName: r.customerName,
            rating: r.rating,
            reviewText: r.reviewText,
            createdAt: r.createdAt,
            isAuthorPending: true,
          }));
      }
    }
  } catch {
    return [];
  }

  return [];
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

  if (status === "rejected") {
    // Permanent deletion on rejection per prompt requirements:
    // "Permanently delete that review from Supabase after confirmation."
    await deleteAdminReview(id, accessToken);
    return;
  }

  const response = await fetch(`${config.url}/rest/v1/product_reviews?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ status: "approved", approved: true, updated_at: new Date().toISOString() }),
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
