import { unstable_cache } from "next/cache";

import { prisma } from "./prisma";
import { sanitizePhotosArray, serializeInventoryItem } from "./inventory-serialization";

export type PublicInventoryListItem = {
  id: string;
  skuInternal: string;
  title: string | null;
  price: number | null;
  stock: number;
  mlItemId: string | null;
  sellerCustomField: string | null;
  updatedAt: string;
  extraData: Record<string, unknown> | null;
  photoCount: number;
  photoPreview: string | null;
};

export type PublicInventoryPaginatedResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: PublicInventoryListItem[];
};

const ACTIVE_ITEMS_WHERE = {
  status: "active" as const
};

const PHOTO_PREVIEW_LIMIT = 6;

const cachedPublicInventoryPage = unstable_cache(
  async (page: number, pageSize: number) => {
    const [total, items] = await Promise.all([
      prisma.inventoryItem.count({ where: ACTIVE_ITEMS_WHERE }),
      prisma.inventoryItem.findMany({
        where: ACTIVE_ITEMS_WHERE,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      })
    ]);

    const serialized = items.map((item, index) => {
      const serializedItem = serializeInventoryItem(item, {
        includePhotoPreview: index < PHOTO_PREVIEW_LIMIT
      });
      return {
        id: serializedItem.id,
        skuInternal: serializedItem.skuInternal,
        title: serializedItem.title ?? null,
        price: serializedItem.price ?? null,
        stock: serializedItem.stock ?? 0,
        mlItemId: serializedItem.mlItemId ?? null,
        sellerCustomField: serializedItem.sellerCustomField ?? null,
        extraData: serializedItem.extraData,
        photoCount: serializedItem.photoCount ?? 0,
        photoPreview: serializedItem.photoPreview ?? null,
        updatedAt: item.updatedAt.toISOString()
      } satisfies PublicInventoryListItem;
    });

    return { total, items: serialized };
  },
  ["public-inventory-page"],
  { revalidate: 300 }
);

export async function getPublicInventoryPage(page: number, pageSize: number): Promise<PublicInventoryPaginatedResult> {
  const { total, items } = await cachedPublicInventoryPage(page, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    items
  };
}

const cachedPublicInventoryPhotos = unstable_cache(
  async (itemId: string) => {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: { extraData: true, status: true }
    });

    if (!item || item.status !== "active") {
      return null;
    }

    return sanitizePhotosArray(item.extraData ?? null);
  },
  ["public-inventory-photos"],
  { revalidate: 300 }
);

export async function getPublicInventoryPhotos(itemId: string): Promise<string[] | null> {
  return cachedPublicInventoryPhotos(itemId);
}
