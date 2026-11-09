"use server";

import { revalidatePath } from "next/cache";
import { headers, cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { submitProductReview } from "@/lib/reviews";
import { verifySameOrigin } from "@/lib/supabase-admin";

export type ReviewFormState = {
  error: string | null;
  success: boolean;
  pendingReview?: {
    id: string;
    productId: string;
    customerName: string;
    rating: number;
    reviewText: string;
    createdAt: string;
    isAuthorPending: boolean;
  } | null;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

// In-memory rate limiting guard for review submissions (max 3 submissions per IP per 15 minutes)
const reviewAttempts = new Map<string, number[]>();

function verifyRateLimit(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(address).digest("hex");
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (reviewAttempts.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= 3) {
    throw new Error("You have submitted multiple reviews recently. Please wait a few minutes before submitting another.");
  }
  recent.push(now);
  reviewAttempts.set(key, recent);
}

export async function submitReviewAction(
  _: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  try {
    const requestHeaders = await headers();
    await verifySameOrigin();

    // 1. Honeypot check (anti-bot)
    if (text(formData.get("website"))) {
      return { error: "Your submission could not be processed.", success: false };
    }

    // 2. IP Rate limit check
    verifyRateLimit(requestHeaders);

    const productId = text(formData.get("product_id"));
    const productSlug = text(formData.get("product_slug"));
    const customerName = text(formData.get("customer_name"));
    const ratingRaw = text(formData.get("rating"));
    const reviewText = text(formData.get("review_text"));
    const customerEmail = text(formData.get("customer_email"));

    if (!productId) {
      return { error: "Product reference is missing.", success: false };
    }

    const rating = parseInt(ratingRaw, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return { error: "Please select a star rating between 1 and 5.", success: false };
    }

    const receiptToken = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(receiptToken).digest("hex");

    const result = await submitProductReview({
      productId,
      customerName,
      rating,
      reviewText,
      customerEmail: customerEmail || null,
      authorTokenHash: tokenHash,
    });

    if (!result.ok) {
      return { error: result.error ?? "Failed to submit review.", success: false };
    }

    const reviewId = result.reviewId || `pending-${Date.now()}`;
    const createdAt = new Date().toISOString();

    // Store author receipt in HttpOnly cookie so author can see their pending review on refresh
    try {
      const cookieStore = await cookies();
      const existingRaw = cookieStore.get("ns_author_reviews")?.value;
      let receipts: Array<{
        reviewId: string;
        receiptToken: string;
        productId: string;
        customerName: string;
        rating: number;
        reviewText: string;
        createdAt: string;
      }> = [];

      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) {
            receipts = parsed.filter(
              (r) => r && typeof r.productId === "string" && typeof r.reviewId === "string",
            );
          }
        } catch {
          // ignore corrupted cookie
        }
      }

      receipts.unshift({
        reviewId,
        receiptToken,
        productId,
        customerName,
        rating,
        reviewText,
        createdAt,
      });

      // Keep up to 20 most recent author receipts
      if (receipts.length > 20) {
        receipts = receipts.slice(0, 20);
      }

      cookieStore.set("ns_author_reviews", JSON.stringify(receipts), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    } catch {
      // Cookie failure shouldn't fail the submission
    }

    if (productSlug) {
      revalidatePath(`/products/${productSlug}`);
    }
    revalidatePath("/products");
    revalidatePath("/admin/reviews");

    return {
      error: null,
      success: true,
      pendingReview: {
        id: reviewId,
        productId,
        customerName,
        rating,
        reviewText,
        createdAt,
        isAuthorPending: true,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "An error occurred while submitting your review.",
      success: false,
    };
  }
}
