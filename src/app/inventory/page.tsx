export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InventoryClient } from "./client";
import type { InventoryClientItem, InventoryInitialPage } from "./client";
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

  const plainItems: InventoryClientItem[] = items.map((item) => serializeInventoryItem(item) as InventoryClientItem);

  const initialPage: InventoryInitialPage = {
    items: plainItems,
    page: 1,
    pageSize: INITIAL_PAGE_SIZE,
    total
  };

  return (
    <InventoryClient
      initialPage={initialPage}
      userRole={session.user.role ?? "operator"}
    />
  );
}
