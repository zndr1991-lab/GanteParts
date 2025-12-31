export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { PublicInventoryClient } from "./client";

function serializeExtra(data: unknown) {
  if (typeof data === "object" && data !== null) {
    return data as Record<string, unknown>;
  }
  return null;
}

export default async function PublicInventoryPage() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      status: "active"
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      skuInternal: true,
      title: true,
      price: true,
      stock: true,
      mlItemId: true,
      sellerCustomField: true,
      extraData: true,
      updatedAt: true
    }
  });

  const plainItems = items.map((item) => ({
    ...item,
    price: item.price !== null && item.price !== undefined ? Number(item.price) : null,
    extraData: serializeExtra(item.extraData),
    updatedAt: item.updatedAt.toISOString()
  }));

  return <PublicInventoryClient items={plainItems} />;
}
