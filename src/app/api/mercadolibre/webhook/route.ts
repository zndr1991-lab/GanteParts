export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { fetchItemSnapshotByMlUserId, getMercadoLibreAccountByMlUserId } from "@/lib/mercadolibre";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const STATUS_MAPPING: Record<string, string> = {
  active: "active",
  paused: "paused",
  closed: "inactive",
  inactive: "inactive",
  not_yet_active: "inactive",
  under_review: "inactive",
  payment_required: "inactive"
};

const SUPPORTED_TOPICS = new Set(["items"]);

function verifySecret(req: Request) {
  const provided = req.headers.get("x-ml-signature") || "";
  const expected = process.env.ML_WEBHOOK_SECRET || "";
  return expected.length > 0 && provided === expected;
}

function extractItemId(resource?: string | null) {
  if (!resource) return null;
  const clean = resource.split("?")[0];
  const segments = clean.split("/").map((segment) => segment.trim()).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i].toUpperCase();
    if (segment.startsWith("ML") && /\d/.test(segment)) {
      return segment;
    }
  }
  return null;
}

function mapStatus(status?: string | null) {
  if (!status) return "inactive";
  const normalized = status.toLowerCase();
  return STATUS_MAPPING[normalized] ?? "inactive";
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    await prisma.auditLog.create({
      data: { action: "ml:webhook", metadata: { error: "payload_invalid" } }
    });
    return NextResponse.json({ ok: true });
  }

  const topic = typeof payload.topic === "string" ? payload.topic : "";
  const resource = typeof payload.resource === "string" ? payload.resource : "";
  const mlUserId = payload.user_id !== undefined && payload.user_id !== null ? String(payload.user_id) : "";

  if (!SUPPORTED_TOPICS.has(topic) || !resource || !mlUserId) {
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        metadata: { payload, reason: "ignored", topic, resource, mlUserId }
      }
    });
    return NextResponse.json({ ok: true });
  }

  const itemId = extractItemId(resource);
  if (!itemId) {
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        metadata: { payload, reason: "no_item_id", resource }
      }
    });
    return NextResponse.json({ ok: true });
  }

  const account = await getMercadoLibreAccountByMlUserId(mlUserId);
  if (!account) {
    const fallbackItem = await prisma.inventoryItem.findFirst({
      where: {
        mlItemId: {
          equals: itemId,
          mode: "insensitive"
        }
      },
      select: { ownerId: true }
    });
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        userId: fallbackItem?.ownerId ?? null,
        metadata: {
          payload,
          reason: "account_not_found",
          error: "Cuenta de Mercado Libre no vinculada",
          mlUserId,
          itemId
        }
      }
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const snapshot = await fetchItemSnapshotByMlUserId(mlUserId, itemId);
    const nextStatus = mapStatus(snapshot?.status);
    const updateData: Record<string, unknown> = { status: nextStatus };
    if (typeof snapshot?.available_quantity === "number") {
      updateData.stock = snapshot.available_quantity;
    }

    const updateResult = await prisma.inventoryItem.updateMany({
      where: { mlItemId: itemId, ownerId: account.userId },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        userId: account.userId,
        metadata: {
          payload,
          itemId,
          status: snapshot?.status ?? null,
          mappedStatus: nextStatus,
          updated: updateResult.count
        }
      }
    });

    return NextResponse.json({ ok: true, updated: updateResult.count });
  } catch (error: any) {
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        userId: account.userId,
        metadata: {
          payload,
          itemId,
          error: error?.message ?? "unknown"
        }
      }
    });
    return NextResponse.json({ ok: false });
  }
}
