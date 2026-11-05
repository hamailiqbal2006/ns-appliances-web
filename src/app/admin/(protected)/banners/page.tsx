import { cookies } from "next/headers";
import { getAdminHomepageBanners } from "@/lib/homepage-banners";
import { BannerEditorForm } from "./banner-editor-form";
import styles from "../../admin.module.css";

export const instant = false;

export default async function HomepageBannersPage() {
  const token = (await cookies()).get("ns-admin-access")?.value ?? null;
  const { banners, isReady } = await getAdminHomepageBanners(token);

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Storefront</p>
          <h1>Homepage Banners</h1>
          <p className={styles.subtitle}>
            Manage background artwork and rotation order for the 3 rotating ambient hero slots on the public website.
          </p>
        </div>
      </div>
      <BannerEditorForm banners={banners} isReady={isReady} />
    </>
  );
}
