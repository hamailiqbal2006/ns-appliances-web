import { cookies } from "next/headers";
import {
  getAdminHomepageBanners,
  getAdminHomepageSliderSettings,
} from "@/lib/homepage-banners";
import { BannerEditorForm } from "./banner-editor-form";
import styles from "../../admin.module.css";

export const instant = false;

export default async function HomepageBannersPage() {
  const token = (await cookies()).get("ns-admin-access")?.value ?? null;
  const [
    { banners, isReady, supportsMobileImage, supportsEnabledToggle },
    { settings: sliderSettings, isSettingsReady },
  ] = await Promise.all([
    getAdminHomepageBanners(token),
    getAdminHomepageSliderSettings(token),
  ]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Storefront</p>
          <h1>Homepage Banners</h1>
          <p className={styles.subtitle}>
            Manage banner rotation settings, transition timing, and responsive dual artwork for the homepage hero showcase.
          </p>
        </div>
      </div>
      <BannerEditorForm
        banners={banners}
        isReady={isReady}
        supportsMobileImage={supportsMobileImage}
        supportsEnabledToggle={supportsEnabledToggle}
        sliderSettings={sliderSettings}
        isSettingsReady={isSettingsReady}
      />
    </>
  );
}
