import { cookies } from "next/headers";
import {
  getAdminHomepageBanners,
  getAdminHomepageSliderSettings,
} from "@/lib/homepage-banners";
import { BannerEditorForm } from "./banner-editor-form";

export const instant = false;

export default async function HomepageBannersPage() {
  const token = (await cookies()).get("ns-admin-access")?.value ?? null;
  const [
    { banners, isReady, supportsMobileImage, supportsEnabledToggle, supportsTitle },
    { settings: sliderSettings, isSettingsReady },
  ] = await Promise.all([
    getAdminHomepageBanners(token),
    getAdminHomepageSliderSettings(token),
  ]);

  const formKey = `${banners.map((b) => `${b.id}-${b.sortOrder}-${b.title}-${b.imagePath}-${b.mobileImagePath}-${b.isEnabled}`).join(":")}-${sliderSettings.intervalSeconds}`;

  return (
    <BannerEditorForm
      key={formKey}
      banners={banners}
      isReady={isReady}
      supportsMobileImage={supportsMobileImage}
      supportsEnabledToggle={supportsEnabledToggle}
      supportsTitle={supportsTitle}
      sliderSettings={sliderSettings}
      isSettingsReady={isSettingsReady}
    />
  );
}
