const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { status: "active", extraData: { not: null } },
    select: { id: true, extraData: true, status: true }
  });

  if (!item) {
    console.log("NO_ITEM");
    return;
  }

  const extra = item.extraData;
  const keys = extra && typeof extra === "object" ? Object.keys(extra) : [];
  const photos = extra && typeof extra === "object"
    ? (extra.photos || extra.fotos || extra.imagenes || extra.images)
    : null;
  const sample = Array.isArray(photos) && photos.length ? photos[0] : null;
  const preview = typeof sample === "string" ? sample.slice(0, 30) : null;

  console.log(
    "ID",
    item.id,
    "STATUS",
    item.status,
    "EXTRA_TYPE",
    typeof extra,
    "PHOTOS_TYPE",
    Array.isArray(photos) ? "array" : typeof photos,
    "PHOTOS_LEN",
    Array.isArray(photos) ? photos.length : 0,
    "PHOTO_SAMPLE_TYPE",
    sample ? typeof sample : "none",
    "PHOTO_SAMPLE_PREVIEW",
    preview ?? "none",
    "EXTRA_KEYS",
    keys.slice(0, 10).join(",")
  );
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
