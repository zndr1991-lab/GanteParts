export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InventoryClient } from "./client";
import { serializeInventoryItem } from "@/lib/inventory-serialization";

const INITIAL_PAGE_SIZE = 100;

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user.role ?? "").toLowerCase();
  const where = role === "viewer" ? { ownerId: session.user.id } : undefined;

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: INITIAL_PAGE_SIZE
    }),
    prisma.inventoryItem.count({ where })
  ]);

  const plainItems = items.map((item) => serializeInventoryItem(item));

  return (
    <InventoryClient
      initialPage={{ items: plainItems, page: 1, pageSize: INITIAL_PAGE_SIZE, total }}
      userRole={session.user.role ?? "operator"}
    />
  );
}
