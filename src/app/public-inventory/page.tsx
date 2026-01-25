export const revalidate = 60;

import { getPublicInventoryPage } from "@/lib/public-inventory";
import { PublicInventoryClient } from "./client";

const INITIAL_PAGE_SIZE = 48;

export default async function PublicInventoryPage() {
  const initialPage = await getPublicInventoryPage(1, INITIAL_PAGE_SIZE);
  return <PublicInventoryClient initialPage={initialPage} />;
}
