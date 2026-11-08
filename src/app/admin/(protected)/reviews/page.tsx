import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/supabase-admin";
import { getAdminReviews } from "@/lib/reviews";
import type { ReviewStatus } from "@/lib/gallery-types";
import { moderateReviewAction, deleteReviewAction } from "../../actions";
import { ConfirmedDeleteForm } from "../confirmed-delete-form";
import styles from "../../admin.module.css";

// This route reads the administrator's session before rendering.
export const instant = false;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ns-admin-access")?.value || "";

  const activeStatus = ["pending", "approved", "rejected"].includes(status ?? "")
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
        <Link
          href="/admin/reviews?status=rejected"
          className={activeStatus === "rejected" ? styles.filterActive : styles.filterLink}
        >
          Rejected
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
        <div className={styles.tablePanel}>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th scope="col" style={{ width: "20%" }}>Product</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Rating</th>
                  <th scope="col" style={{ width: "35%" }}>Review Comment</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.productSlug ? (
                        <Link
                          href={`/products/${r.productSlug}`}
                          target="_blank"
                          className={styles.tableLink}
                        >
                          {r.productName || "View product ↗"}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{r.productName || "General showroom review"}</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: "var(--admin-text-primary)", fontSize: "13.5px" }}>{r.customerName}</strong>
                        {r.customerEmail && (
                          <div style={{ fontSize: "11.5px", color: "var(--admin-text-muted)", marginTop: "2px" }}>
                            {r.customerEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--admin-primary)", fontSize: "13px" }}>
                        ★ {r.rating} / 5
                      </span>
                    </td>
                    <td style={{ maxWidth: "340px", whiteSpace: "normal" }}>
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.45, color: "var(--admin-text-secondary)" }}>
                        {r.reviewText}
                      </p>
                    </td>
                    <td style={{ fontSize: "12.5px", color: "var(--admin-text-muted)" }}>
                      {formatDate(r.createdAt)}
                    </td>
                    <td>
                      <span className={styles.statusDotLabel}>
                        <span
                          className={`${styles.statusDot} ${
                            r.status === "approved"
                              ? styles.statusDotActive
                              : r.status === "rejected"
                              ? styles.statusDotDanger
                              : styles.statusDotWarning
                          }`}
                          aria-hidden
                        />
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "6px",
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        {r.status !== "approved" && (
                          <form action={moderateReviewAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button
                              type="submit"
                              className={styles.primaryButton}
                              style={{
                                minHeight: "30px",
                                padding: "4px 10px",
                                fontSize: "12px",
                              }}
                            >
                              Approve
                            </button>
                          </form>
                        )}

                        {r.status !== "rejected" && (
                          <form action={moderateReviewAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button
                              type="submit"
                              className={styles.secondaryButton}
                              style={{
                                minHeight: "30px",
                                padding: "4px 10px",
                                fontSize: "12px",
                              }}
                            >
                              Reject
                            </button>
                          </form>
                        )}

                        <ConfirmedDeleteForm
                          action={deleteReviewAction}
                          id={r.id}
                          confirmationMessage="Are you sure you want to delete this customer review?"
                          title="Delete permanently"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
