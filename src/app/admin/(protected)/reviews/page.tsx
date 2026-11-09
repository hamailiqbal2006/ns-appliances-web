import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/supabase-admin";
import { getAdminReviews } from "@/lib/reviews";
import type { ReviewStatus } from "@/lib/gallery-types";
import { ReviewsTable } from "./reviews-table";
import styles from "../../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value || "";

  const activeStatus = ["pending", "approved"].includes(status ?? "")
    ? (status as ReviewStatus)
    : undefined;

  const reviews = accessToken ? await getAdminReviews(accessToken, activeStatus) : [];
  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Feedback</p>
          <h1>Customer Reviews</h1>
          <p className={styles.subtitle}>
            Moderate customer ratings, product feedback, and showroom testimonials.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span style={{ fontSize: "13px", color: "var(--admin-text-secondary)", fontWeight: 500 }}>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}{" "}
            {pendingCount > 0 && `(${pendingCount} pending moderation)`}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterRow}>
        <Link
          href="/admin/reviews"
          className={!activeStatus ? styles.filterActive : styles.filterLink}
        >
          All Reviews
        </Link>
        <Link
          href="/admin/reviews?status=pending"
          className={activeStatus === "pending" ? styles.filterActive : styles.filterLink}
        >
          Pending Moderation {pendingCount > 0 && `(${pendingCount})`}
        </Link>
        <Link
          href="/admin/reviews?status=approved"
          className={activeStatus === "approved" ? styles.filterActive : styles.filterLink}
        >
          Approved &amp; Live
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className={styles.tablePanel}>
          <div className={styles.emptyState}>
            <h2>No customer reviews found</h2>
            <p>
              {activeStatus
                ? `There are currently no ${activeStatus} customer reviews in the database.`
                : "No customer reviews have been submitted yet."}
            </p>
          </div>
        </div>
      ) : (
        <ReviewsTable reviews={reviews} />
      )}
    </>
  );
}
