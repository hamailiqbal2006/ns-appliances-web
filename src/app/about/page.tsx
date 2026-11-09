import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { AboutExperience } from "./about-experience";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "NS Home Appliances",
  description:
    "For over three decades, NS Home Appliances has helped Pakistani homes find everyday comfort with care and quality.",
};

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <SiteNav homeLinks alwaysFormed />
      <AboutExperience />
      <SiteFooter variant="static" />
    </div>
  );
}
