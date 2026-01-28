export const revalidate = 60;

import { getPublicInventoryPage } from "@/lib/public-inventory";
import { PublicInventoryClient } from "./client";

// usamos un pageSize grande para traer todo el inventario de una sola vez
const PUBLIC_FULL_PAGE_SIZE = Number(process.env.PUBLIC_INVENTORY_PAGE_SIZE ?? "2000");
const INITIAL_PAGE_SIZE = Number.isFinite(PUBLIC_FULL_PAGE_SIZE) && PUBLIC_FULL_PAGE_SIZE > 0 ? PUBLIC_FULL_PAGE_SIZE : 2000;

export default async function PublicInventoryPage() {
  const initialPage = await getPublicInventoryPage(1, INITIAL_PAGE_SIZE);
  return <PublicInventoryClient initialPage={initialPage} />;
}
