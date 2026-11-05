import { HomeExperience } from "@/components/home-experience";
import { getAnnouncementBar } from "@/lib/announcement-bar";
import { getHomepageBanners } from "@/lib/homepage-banners";

export default async function Home() {
  const [banners, announcement] = await Promise.all([getHomepageBanners(), getAnnouncementBar()]);
  return <HomeExperience banners={banners} announcement={announcement} />;
}
