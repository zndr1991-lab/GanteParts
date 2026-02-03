import type { InventoryClientItem } from "@/app/inventory/client";
import { prisma } from "@/lib/prisma";
import { INVENTORY_LIST_SELECT, serializeInventoryItem } from "@/lib/inventory-serialization";

const DEFAULT_SNAPSHOT_LIMIT = 2000;
const INVENTORY_FULL_LOAD_ENV = Number(process.env.INVENTORY_FULL_LOAD_LIMIT ?? `${DEFAULT_SNAPSHOT_LIMIT}`);
const MAX_CACHE_TAKE =
  Number.isFinite(INVENTORY_FULL_LOAD_ENV) && INVENTORY_FULL_LOAD_ENV > 0
    ? INVENTORY_FULL_LOAD_ENV
    : DEFAULT_SNAPSHOT_LIMIT;

export const getInventorySnapshot = async (ownerId: string | null, take: number) => {
  const where = ownerId ? { ownerId } : undefined;
  const requested = Number.isFinite(take) && take > 0 ? take : MAX_CACHE_TAKE;
  const limit = Math.max(1, Math.min(requested, MAX_CACHE_TAKE));

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: INVENTORY_LIST_SELECT
    }),
    prisma.inventoryItem.count({ where })
  ]);

  return {
    items: items.map((item) => serializeInventoryItem(item) as InventoryClientItem),
    total
  };
};
