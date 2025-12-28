export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activateItem, pauseItem } from "@/lib/mercadolibre";

const actionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["pause", "activate"])
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const { ids, action } = parsed.data;

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: ids }, ownerId: session.user.id }
  });

  if (!items.length) {
    return NextResponse.json({ error: "Items no encontrados" }, { status: 404 });
  }

  const failed: Array<{ id: string; reason: string }> = [];
  let successCount = 0;

  for (const item of items) {
    if (!item.mlItemId) {
      failed.push({ id: item.id, reason: "Sin codigo de Mercado Libre" });
      continue;
    }

    try {
      if (action === "pause") {
        await pauseItem(session.user.id, item.mlItemId);
        await prisma.inventoryItem.update({ where: { id: item.id }, data: { status: "paused" } });
      } else if (action === "activate") {
        await activateItem(session.user.id, item.mlItemId);
        await prisma.inventoryItem.update({ where: { id: item.id }, data: { status: "active" } });
      }
      successCount += 1;
    } catch (error: any) {
      failed.push({ id: item.id, reason: error?.message ?? "Error desconocido" });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: `ml:${action}`,
      userId: session.user.id,
      metadata: {
        requestedIds: ids,
        successCount,
        failed
      }
    }
  });

  if (!successCount) {
    return NextResponse.json({ error: "No se pudo completar la accion", failed }, { status: 502 });
  }

  return NextResponse.json({ ok: true, successCount, failed, partial: failed.length > 0 }, { status: 200 });
}
