import { cookies } from "next/headers";
import { getAdminCategoryShowcase } from "@/lib/category-showcase.server";
import { CategoryShowcaseForm } from "./category-showcase-form";

export const instant = false;

export default async function CategoryShowcasePage() {
  const token = (await cookies()).get("ns-admin-access")?.value ?? null;
  const { items, isDatabaseReady } = await getAdminCategoryShowcase(token);

  return (
    <CategoryShowcaseForm
      initialItems={items}
      isDatabaseReady={isDatabaseReady}
    />
  );
}
