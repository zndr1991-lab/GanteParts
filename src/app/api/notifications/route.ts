export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SUPPORTED_ACTIONS = ["ml:webhook"];

function buildMessage(params: {
  itemId: string | null;
  status: string | null;
  success: boolean;
  error: string | null;
}) {
  const { itemId, status, success, error } = params;
  const displayId = itemId ?? "publicacion";
  if (error) {
    return `No se pudo sincronizar ${displayId}: ${error}`;
  }
  if (!success) {
    return `${displayId} no pudo actualizarse en la base interna`;
  }
  if (!status) {
    return `${displayId} se sincronizo`; 
  }
  const verb = status === "active" ? "se activo" : status === "paused" ? "se pauso" : "cambio de estado";
  return `${displayId} ${verb}`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.floor(limitParam), 1), 50) : 12;

  const logs = await prisma.auditLog.findMany({
    where: {
      userId: session.user.id,
      action: { in: SUPPORTED_ACTIONS }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  const notifications = logs.map((log) => {
    const metadata = (log.metadata ?? {}) as Record<string, any>;
    const itemId = typeof metadata.itemId === "string" ? metadata.itemId : null;
    const payloadResource = typeof metadata.payload?.resource === "string" ? metadata.payload.resource : null;
    const derivedItemId = itemId ?? payloadResource;
    const status = typeof metadata.mappedStatus === "string" ? metadata.mappedStatus : typeof metadata.status === "string" ? metadata.status : null;
    const updated = typeof metadata.updated === "number" ? metadata.updated : null;
    const error = typeof metadata.error === "string" ? metadata.error : null;
    const success = error ? false : updated === null ? true : updated > 0;

    return {
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      itemId: derivedItemId,
      status,
      success,
      message: buildMessage({ itemId: derivedItemId, status, success, error })
    };
  });

  return NextResponse.json({ notifications });
}
