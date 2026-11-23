import { cookies } from "next/headers";
import { getAdminCategoryShowcase } from "@/lib/category-showcase.server";
import { CategoryShowcaseForm } from "./category-showcase-form";


export default async function CategoryShowcasePage() {
  const token = (await cookies()).get("ns-admin-access")?.value ?? null;
  const { items, isDatabaseReady } = await getAdminCategoryShowcase(token);

  return (
    <CategoryShowcaseForm
      key={JSON.stringify(items)}
      initialItems={items}
      isDatabaseReady={isDatabaseReady}
    />
  );
}
