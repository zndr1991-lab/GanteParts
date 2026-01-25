import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizePhotosArray } from "@/lib/inventory-serialization";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user.role ?? "").toLowerCase();
  const where = role === "viewer" ? { id: params.id, ownerId: session.user.id } : { id: params.id };

  const item = await prisma.inventoryItem.findFirst({
    where,
    select: {
      id: true,
      extraData: true
    }
  });

  if (!item) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  const photos = sanitizePhotosArray((item.extraData as any)?.photos);
  return NextResponse.json({ photos });
}
