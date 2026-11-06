import { HomeExperience } from "@/components/home-experience";
import { getAnnouncementBar } from "@/lib/announcement-bar";
import { getHomepageBanners, getHomepageSliderSettings } from "@/lib/homepage-banners";

export default async function Home() {
  const [banners, announcement, sliderSettings] = await Promise.all([
    getHomepageBanners(),
    getAnnouncementBar(),
    getHomepageSliderSettings(),
  ]);
  return (
    <HomeExperience
      banners={banners}
      announcement={announcement}
      sliderSettings={sliderSettings}
    />
  );
}
