import { HomeExperience } from "@/components/home-experience";
import { getAnnouncementBar } from "@/lib/announcement-bar";
import { getHomepageBanners, getHomepageSliderSettings } from "@/lib/homepage-banners";
import { getHomepageCategoryShowcase } from "@/lib/category-showcase.server";

// The hosting build may not have runtime-only Supabase secrets. Always render
// the managed homepage with current data at request time.
export const dynamic = "force-dynamic";

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
