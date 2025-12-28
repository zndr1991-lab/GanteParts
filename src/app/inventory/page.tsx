export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InventoryClient } from "./client";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const items = await prisma.inventoryItem.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" }
  });

  const plainItems = items.map((item) => {
    const extraData = typeof item.extraData === "object" && item.extraData !== null ? item.extraData : null;
    return {
      ...item,
      extraData,
      price: item.price !== null && item.price !== undefined ? Number(item.price) : null
    };
  });

  return <InventoryClient initialItems={plainItems} />;
}
