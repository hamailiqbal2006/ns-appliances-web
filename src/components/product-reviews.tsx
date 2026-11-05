"use client";

import { useState, useActionState } from "react";
import type { PublicProductReview } from "@/lib/gallery-types";
import { submitReviewAction, type ReviewFormState } from "@/app/review-actions";
import styles from "./product-reviews.module.css";

interface ProductReviewsProps {
  productId: string;
  productSlug: string;
  productName: string;
  initialReviews: PublicProductReview[];
}

function StarIcon({ filled, size = 15 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={filled ? styles.starFilled : styles.starEmpty}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function ProductReviews({
  productId,
  productSlug,
  productName,
  initialReviews,
}: ProductReviewsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [formState, formAction, isPending] = useActionState<ReviewFormState, FormData>(
    submitReviewAction,
    { error: null, success: false },
  );

  const totalReviews = initialReviews.length;
  const averageRating = totalReviews
    ? Math.round((initialReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : null;

  return (
    <section className={styles.reviewsSection} aria-labelledby="reviews-heading">
      {/* Compact Header: Integrated naturally into page */}
      <div className={styles.headerRow}>
        <div className={styles.titleColumn}>
          <h2 id="reviews-heading" className={styles.sectionTitle}>
            Customer Reviews
          </h2>
          {totalReviews === 0 ? (
            <p className={styles.emptyMessage}>No reviews yet.</p>
          ) : averageRating !== null ? (
            <div className={styles.ratingSummaryRow}>
              <div
                className={styles.starsRow}
                aria-label={`Average rating: ${averageRating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} filled={star <= Math.round(averageRating)} size={15} />
                ))}
              </div>
              <span className={styles.avgRatingText}>
                {averageRating.toFixed(1)} · {totalReviews} review{totalReviews === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
        </div>

        {/* Understated Write a Review Action */}
        <button
          type="button"
          className={styles.writeReviewTrigger}
          onClick={() => setIsFormOpen((prev) => !prev)}
          aria-expanded={isFormOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>{isFormOpen ? "Close Form" : "Write a Review"}</span>
        </button>
      </div>

      {/* Approved Reviews List */}
      {totalReviews > 0 && (
        <div className={styles.reviewsList}>
          {initialReviews.map((rev) => (
            <article key={rev.id} className={styles.reviewCard}>
              <div className={styles.reviewCardHeader}>
                <div className={styles.reviewerInfo}>
                  <span className={styles.reviewerName}>{rev.customerName}</span>
                  <div className={styles.starsRow} aria-label={`Rating: ${rev.rating} of 5`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon key={s} filled={s <= rev.rating} size={13} />
                    ))}
                  </div>
                </div>
                <time className={styles.reviewDate} dateTime={rev.createdAt}>
                  {formatDate(rev.createdAt)}
                </time>
              </div>
              <p className={styles.reviewBody}>{rev.reviewText}</p>
            </article>
          ))}
        </div>
      )}

      {/* Expandable Compact Review Form */}
      {(isFormOpen || formState.success) && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>Write a Review</h3>
          <p className={styles.formSubtitle}>
            Reviews are submitted for showroom staff moderation before public display.
          </p>

          {formState.success ? (
            <div className={styles.feedbackSuccess} role="status">
              <strong>Thank you!</strong> Your review for {productName} has been received. Once approved by showroom moderation, it will appear publicly on this product page.
            </div>
          ) : (
            <form action={formAction} className={styles.form} noValidate>
              <input type="hidden" name="product_id" value={productId} />
              <input type="hidden" name="product_slug" value={productSlug} />
              <input type="hidden" name="rating" value={rating} />

              {/* Anti-spam honeypot */}
              <div className={styles.honeypot} aria-hidden="true">
                <label>
                  Website URL
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {/* Professional Interactive Star Rating Selector */}
              <div className={styles.ratingSelectRow}>
                <span className={styles.ratingLabel}>Your Rating:</span>
                <div
                  className={styles.interactiveStars}
                  role="radiogroup"
                  aria-label="Star rating options"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating ?? rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={rating === star}
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        className={`${styles.starButton} ${isFilled ? styles.starButtonActive : ""}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onFocus={() => setHoverRating(star)}
                        onBlur={() => setHoverRating(null)}
                      >
                        <StarIcon filled={isFilled} size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Fields: Name and Optional Email */}
              <div className={styles.inputGrid}>
                <div className={styles.inputField}>
                  <label htmlFor="customer_name" className={styles.inputFieldLabel}>
                    Your Name <span style={{ color: "#b6413e" }}>*</span>
                  </label>
                  <input
                    id="customer_name"
                    name="customer_name"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Tariq Mehmood"
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.inputField}>
                  <label htmlFor="customer_email" className={styles.inputFieldLabel}>
                    Email Address <span className={styles.optionalBadge}>(Optional)</span>
                  </label>
                  <input
                    id="customer_email"
                    name="customer_email"
                    type="email"
                    maxLength={254}
                    placeholder="e.g. name@example.com"
                    className={styles.textInput}
                  />
                  <span className={styles.privacyNote}>
                    Private — used only for showroom contact, never shown publicly.
                  </span>
                </div>
              </div>

              {/* Review Comment Text */}
              <div className={styles.inputField}>
                <label htmlFor="review_text" className={styles.inputFieldLabel}>
                  Review Comment <span style={{ color: "#b6413e" }}>*</span>
                </label>
                <textarea
                  id="review_text"
                  name="review_text"
                  required
                  rows={3}
                  minLength={5}
                  maxLength={2000}
                  placeholder="Share your experience regarding performance, build quality, power consumption, or showroom service..."
                  className={styles.textareaInput}
                />
              </div>

              {formState.error && (
                <div className={styles.feedbackError} role="alert">
                  {formState.error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className={styles.submitButton}
              >
                {isPending ? "Submitting review…" : "Submit Review"}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
