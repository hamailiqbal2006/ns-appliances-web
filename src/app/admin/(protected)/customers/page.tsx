import Link from "next/link";
import { getAdminCustomerLeads } from "@/lib/supabase-admin";
import { CustomersTableClient } from "./customers-table-client";
import styles from "../../admin.module.css";

export const instant = false;

export default async function CustomersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.slice(0, 30) ?? "";
  const { leads, isReady } = await getAdminCustomerLeads(q);
  const exportHref = `/admin/customers/export${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Audience</p>
          <h1>Customers</h1>
          <p className={styles.subtitle}>
            Verified customer contacts captured via the Welcome Offer for direct showroom WhatsApp updates.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href={exportHref}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export opted-in CSV
          </Link>
        </div>
      </div>

      {!isReady ? (
        <div className={styles.noticePanel} style={{ marginTop: "0", marginBottom: "24px" }}>
          <h2>Customer-lead setup required</h2>
          <p>
            The list and export remain blocked until <code>supabase/migrations/20261030_welcome_popup_leads.sql</code> is applied. No visitor contact is exposed publicly.
          </p>
        </div>
      ) : null}

      {/* Styled Search Bar */}
      <form className={styles.filterRow} action="/admin/customers" role="search">
        <div className={styles.searchBar}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search Pakistani phone number (+92...)"
            aria-label="Search WhatsApp number"
            className={styles.searchInput}
          />
          <button className={styles.secondaryButton} type="submit">
            Search
          </button>
        </div>
        {q ? (
          <Link className={styles.filterLink} href="/admin/customers">
            Clear search
          </Link>
        ) : null}
      </form>

      <section className={styles.tablePanel} aria-labelledby="customer-leads-heading">
        <div className={styles.tableTitle}>
          <h2 id="customer-leads-heading">Submitted phone numbers</h2>
          <p>
            {leads.length} {leads.length === 1 ? "customer lead" : "customer leads"}
          </p>
        </div>

        <CustomersTableClient leads={leads} />
      </section>
    </>
  );
}
