import { HomeExperience } from "@/components/home-experience";
import { getAnnouncementBar } from "@/lib/announcement-bar";
import { getHomepageBanners, getHomepageSliderSettings } from "@/lib/homepage-banners";
import { getHomepageCategoryShowcase } from "@/lib/category-showcase.server";

export default async function Home() {
  const [banners, announcement, sliderSettings, categoryShowcase] = await Promise.all([
    getHomepageBanners(),
    getAnnouncementBar(),
    getHomepageSliderSettings(),
    getHomepageCategoryShowcase(),
  ]);
  return (
    <HomeExperience
      banners={banners}
      announcement={announcement}
      sliderSettings={sliderSettings}
      categoryShowcase={categoryShowcase}
    />
  );
}
