export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activateItem, pauseItem } from "@/lib/mercadolibre";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_PHOTOS = 8;

const canEditInventory = (role?: string | null) => {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "admin";
};

const canCreateInventory = (role?: string | null) => {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "admin" || normalized === "operator" || normalized === "uploader";
};

const payloadSchema = z.object({
  skuInternal: z.string().min(1),
  title: z.string().optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().min(0).optional(),
  mlItemId: z.string().optional(),
  sellerCustomField: z.string().optional(),
  status: z.string().optional(),
  extraData: z.record(z.any()).optional()
});

const deleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  password: z.string().min(1).optional()
});

const updateSchema = z.object({
  id: z.string().min(1),
  estatusInterno: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "inactive"]).optional(),
  fechaPrestamoPago: z.string().optional().nullable(),
  prestadoVendidoA: z.string().optional().nullable(),
  origen: z.string().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  photos: z.array(z.string().min(1)).max(MAX_PHOTOS).optional(),
  price: z.number().nonnegative().nullable().optional(),
  mlItemId: z.string().optional().nullable()
});

const serializeItem = (item: any) => ({
  ...item,
  price: item.price !== null && item.price !== undefined ? Number(item.price) : null
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = (session.user.role ?? "").toLowerCase();
  const where = role === "viewer" ? { ownerId: session.user.id } : undefined;

  const items = await prisma.inventoryItem.findMany({ where, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(items.map(serializeItem));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canCreateInventory(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        skuInternal: data.skuInternal,
        title: data.title,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : null,
        stock: data.stock ?? 0,
        mlItemId: data.mlItemId,
        sellerCustomField: data.sellerCustomField,
        status: data.status ?? undefined,
        extraData: data.extraData ?? undefined,
        ownerId: session.user.id
      }
    });

    await prisma.auditLog.create({
      data: {
        action: "inventory:create",
        userId: session.user.id,
        itemId: item.id,
        metadata: { skuInternal: data.skuInternal }
      }
    });

    return NextResponse.json(serializeItem(item), { status: 201 });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "SKU interno duplicado para este usuario" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear item" }, { status: 500 });
  }
}

const DELETE_PASSWORD = process.env.INVENTORY_DELETE_PASSWORD ?? process.env.DELETE_PASSWORD ?? null;

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditInventory(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }
  const { ids, password } = parsed.data;

  if (DELETE_PASSWORD) {
    if (!password) {
      return NextResponse.json({ error: "Se requiere contraseña para borrar" }, { status: 403 });
    }
    if (password !== DELETE_PASSWORD) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
    }
  }

  const result = await prisma.inventoryItem.deleteMany({
    where: { id: { in: ids }, ownerId: session.user.id }
  });

  await prisma.auditLog.create({
    data: {
      action: "inventory:delete",
      userId: session.user.id,
      metadata: { count: result.count, ids }
    }
  });

  return NextResponse.json({ deleted: result.count });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canEditInventory(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const {
    id,
    estatusInterno,
    status,
    fechaPrestamoPago,
    prestadoVendidoA,
    origen,
    ubicacion,
    photos,
    price,
    mlItemId
  } = parsed.data;

  if (status && !["active", "paused", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Estatus invalido" }, { status: 400 });
  }

  const existing = await prisma.inventoryItem.findFirst({ where: { id, ownerId: session.user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  const baseExtra = typeof existing.extraData === "object" && existing.extraData !== null ? existing.extraData : {};
  const nextExtra: Record<string, any> = { ...(baseExtra as Record<string, any>) };
  if (estatusInterno && estatusInterno.trim()) {
    nextExtra.estatus_interno = estatusInterno.trim();
  } else {
    delete nextExtra.estatus_interno;
  }

  if (fechaPrestamoPago && fechaPrestamoPago.trim()) {
    nextExtra.fecha_prestamo_pago = fechaPrestamoPago.trim();
  } else if (fechaPrestamoPago === null) {
    delete nextExtra.fecha_prestamo_pago;
  }

  if (prestadoVendidoA && prestadoVendidoA.trim()) {
    nextExtra.prestado_vendido_a = prestadoVendidoA.trim();
  } else if (prestadoVendidoA === null) {
    delete nextExtra.prestado_vendido_a;
  }

  if (origen && origen.trim()) {
    nextExtra.origen = origen.trim();
  } else if (origen === null) {
    delete nextExtra.origen;
  }

  if (ubicacion && ubicacion.trim()) {
    nextExtra.ubicacion = ubicacion.trim();
  } else if (ubicacion === null) {
    delete nextExtra.ubicacion;
  }

  if (photos !== undefined) {
    const sanitized = photos
      .map((photo) => photo.trim())
      .filter((photo) => photo.length)
      .slice(0, MAX_PHOTOS);
    if (sanitized.length) {
      nextExtra.photos = sanitized;
    } else {
      delete nextExtra.photos;
    }
  }

  let nextMlItemId: string | null | undefined = existing.mlItemId;
  if (mlItemId !== undefined) {
    if (mlItemId === null) {
      nextMlItemId = null;
    } else {
      const normalized = mlItemId.trim().toUpperCase();
      nextMlItemId = normalized.length ? normalized : null;
    }
  }

  if (status && ["active", "paused"].includes(status) && status !== existing.status) {
    if (!nextMlItemId) {
      return NextResponse.json({ error: "El registro no tiene codigo de Mercado Libre" }, { status: 400 });
    }
    try {
      if (status === "paused") {
        await pauseItem(session.user.id, nextMlItemId);
      } else if (status === "active") {
        await activateItem(session.user.id, nextMlItemId);
      }
    } catch (err: any) {
      const message = err?.message || "No se pudo sincronizar con Mercado Libre";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const updateData: Prisma.InventoryItemUpdateInput = {
    extraData: nextExtra,
    status: status ?? undefined,
    mlItemId: mlItemId !== undefined ? nextMlItemId : undefined
  };

  if (price !== undefined) {
    updateData.price = price === null ? null : new Prisma.Decimal(price);
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: updateData
  });

  await prisma.auditLog.create({
    data: {
      action: "inventory:update",
      userId: session.user.id,
      itemId: id,
      metadata: {
        estatusInterno: estatusInterno ?? null,
        status: status ?? null,
        fechaPrestamoPago: fechaPrestamoPago ?? null,
        prestadoVendidoA: prestadoVendidoA ?? null,
        origen: origen ?? null,
        ubicacion: ubicacion ?? null,
        price: price ?? null,
        mlItemId: mlItemId ?? null
      }
    }
  });

  return NextResponse.json(serializeItem(item));
}
