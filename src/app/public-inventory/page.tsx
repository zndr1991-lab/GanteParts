export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPublicInventoryPage } from "@/lib/public-inventory";
import { PublicInventoryClient } from "./client";

const PUBLIC_INITIAL_PAGE_SIZE_ENV = Number(process.env.PUBLIC_INVENTORY_INITIAL_PAGE_SIZE ?? "120");
const INITIAL_PAGE_SIZE =
  Number.isFinite(PUBLIC_INITIAL_PAGE_SIZE_ENV) && PUBLIC_INITIAL_PAGE_SIZE_ENV > 0
    ? PUBLIC_INITIAL_PAGE_SIZE_ENV
    : 120;

export default async function PublicInventoryPage() {
  const initialPage = await getPublicInventoryPage(1, INITIAL_PAGE_SIZE);
  return <PublicInventoryClient initialPage={initialPage} />;
}
