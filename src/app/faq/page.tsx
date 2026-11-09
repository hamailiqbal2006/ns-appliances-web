import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { FaqAccordion } from "@/components/faq-accordion";
import styles from "./faq.module.css";

export const metadata: Metadata = {
  title: "NS Home Appliances",
  description:
    "Answers to common questions about booking, pricing, showroom visits, and appliance purchases at NS Home Appliances.",
};

export default function FaqPage() {
  return (
    <div className={styles.faqPage}>
      <SiteNav homeLinks alwaysFormed />

      <main className={styles.faqMain} id="main-content">
        <FaqAccordion />
      </main>

      <SiteFooter variant="static" />
    </div>
  );
}
