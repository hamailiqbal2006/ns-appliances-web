import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PrivacyExperience } from "./privacy-experience";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | NS Home Appliances",
  description:
    "Learn how NS Home Appliances collects, uses, and safeguards customer information. Transparent, respectful, and secure data handling.",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <SiteNav homeLinks alwaysFormed />
      <main id="main-content">
        <PrivacyExperience />
      </main>
      <SiteFooter variant="static" />
    </div>
  );
}
