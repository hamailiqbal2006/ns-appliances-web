"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "./actions";
import { ThemeSwitch } from "./theme-switch";
import styles from "./admin.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function IconOverview({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function IconProducts({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconCategories({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function IconBanners({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function IconAnnouncement({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function IconReviews({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const navSections: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ href: "/admin", label: "Overview", icon: IconOverview }],
  },
  {
    title: "Store",
    items: [
      { href: "/admin/products", label: "Products", icon: IconProducts },
      { href: "/admin/categories", label: "Categories", icon: IconCategories },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/banners", label: "Homepage Banners", icon: IconBanners },
      { href: "/admin/announcement-bar", label: "Announcement Bar", icon: IconAnnouncement },
    ],
  },
  {
    title: "Reviews",
    items: [
      { href: "/admin/reviews", label: "Customer Reviews", icon: IconReviews },
    ],
  },
  {
    title: "Configuration",
    items: [{ href: "/admin/settings", label: "Store Settings", icon: IconSettings }],
  },
];

export function AdminShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Extract initial for avatar
  const initial = name ? name.charAt(0).toUpperCase() : "A";

  // Derive active label for top breadcrumb
  let currentLabel = "Dashboard";
  for (const sec of navSections) {
    for (const item of sec.items) {
      if (item.href === "/admin") {
        if (pathname === "/admin") currentLabel = item.label;
      } else if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        currentLabel = item.label;
      }
    }
  }

  return (
    <div className={styles.adminApp}>
      {/* Mobile Top Header */}
      <header className={styles.mobileHeader}>
        <Link href="/admin" className={styles.brand} onClick={closeMenu}>
          NS <span className={styles.brandBadge}>Admin</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ThemeSwitch />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="admin-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Menu
          </button>
        </div>
      </header>

      {/* Main Sidebar Drawer */}
      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
        id="admin-navigation"
        aria-label="Admin Navigation"
      >
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.brand} onClick={closeMenu}>
            NS <span className={styles.brandBadge}>Admin</span>
          </Link>
          {menuOpen && (
            <button
              type="button"
              onClick={closeMenu}
              className={styles.menuCloseButton}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        <nav>
          {navSections.map((section) => (
            <div key={section.title} className={styles.navGroup}>
              <h2 className={styles.navGroupTitle}>{section.title}</h2>
              {section.items.map((link) => {
                const isActive =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={isActive ? styles.navLinkActive : styles.navLink}
                    onClick={closeMenu}
                  >
                    <Icon className={styles.navIcon} />
                    <span className={styles.navLabel}>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar} aria-hidden="true">
              {initial}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName} title={name}>
                {name}
              </span>
              <span className={styles.userRole}>Store Administrator</span>
            </div>
          </div>
          <form action={logoutAction} style={{ width: "100%" }}>
            <button type="submit" className={styles.signOutButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className={styles.menuBackdrop}
          onClick={closeMenu}
        />
      ) : null}

      {/* Main Content Area */}
      <div className={styles.mainContainer}>
        {/* Top Header Bar on Desktop */}
        <header className={styles.topBar}>
          <div className={styles.topBarBreadcrumbs}>
            <span className={styles.topBarStoreName}>NS Home Appliances</span>
            <span className={styles.topBarSeparator}>/</span>
            <span className={styles.topBarCurrentPage}>{currentLabel}</span>
          </div>

          <div className={styles.topBarActions}>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.topBarViewStoreLink}
              title="Preview public storefront in a new tab"
            >
              <span>View Store</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>

            <ThemeSwitch />
          </div>
        </header>

        {/* Page Content View */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
