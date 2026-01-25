export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeInventoryItem } from "@/lib/inventory-serialization";
import { redirect } from "next/navigation";

import { InventoryClient } from "../client";

const MANUAL_SUGGESTION_LIMIT = 250;

export default async function ManualInventoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user.role ?? "operator").toLowerCase();
  const where = role === "viewer" ? { ownerId: session.user.id } : undefined;

  const suggestionItems = await prisma.inventoryItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: MANUAL_SUGGESTION_LIMIT
  });

  const serialized = suggestionItems.map((item) => serializeInventoryItem(item));

  return (
    <InventoryClient
      initialPage={{ items: serialized, page: 1, pageSize: serialized.length || 1, total: serialized.length }}
      userRole={session.user.role ?? "operator"}
      mode="manual-only"
    />
  );
}
