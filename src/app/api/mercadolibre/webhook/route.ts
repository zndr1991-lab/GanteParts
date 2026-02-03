export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { createHmac, timingSafeEqual } from "crypto";

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

function verifySignature(params: { signatureHeader: string; secret: string; rawBody: string }) {
  const { signatureHeader, secret, rawBody } = params;
  if (!secret) return true;
  if (!signatureHeader) return false;
  if (signatureHeader === secret) return true;

  const match = signatureHeader.match(/ts=([^,]+),v1=([a-f0-9]+)/i);
  if (!match) return false;
  const [, ts, signature] = match;
  const payload = `${ts}.${rawBody}`;
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  if (digest.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

function verifySignatureFallback(params: { signatureHeader: string; secret: string; rawBody: string }) {
  const { signatureHeader, secret, rawBody } = params;
  if (!secret) return true;
  if (!signatureHeader) return false;
  const hex = signatureHeader.replace(/^v1=|^sha256=/i, "").trim();
  if (!/^[a-f0-9]+$/i.test(hex)) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (digest.length !== hex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(hex, "utf8"));
  } catch {
    return false;
  }
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
  const rawBody = await req.text();
  let payload: any = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }
  const signatureHeader =
    req.headers.get("x-ml-signature") ||
    req.headers.get("x-meli-signature") ||
    req.headers.get("x-meli-signature-v1") ||
    "";
  const secret = process.env.ML_WEBHOOK_SECRET || "";

  if (!verifySignature({ signatureHeader, secret, rawBody }) && !verifySignatureFallback({ signatureHeader, secret, rawBody })) {
    const resource = typeof payload?.resource === "string" ? payload.resource : "";
    const fallbackItemId = extractItemId(resource);
    const fallbackItem = fallbackItemId
      ? await prisma.inventoryItem.findFirst({
          where: {
            mlItemId: {
              equals: fallbackItemId,
              mode: "insensitive"
            }
          },
          select: { ownerId: true }
        })
      : null;

    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        userId: fallbackItem?.ownerId ?? null,
        metadata: {
          payload,
          reason: "signature_invalid",
          error: "Firma webhook invalida"
        }
      }
    });
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const safePayload = payload ?? null;
  if (!safePayload) {
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        metadata: { error: "payload_invalid" }
      }
    });
    return NextResponse.json({ ok: true });
  }
  if (!payload) {
    await prisma.auditLog.create({
      data: { action: "ml:webhook", metadata: { error: "payload_invalid" } }
    });
    return NextResponse.json({ ok: true });
  }

  const topic = typeof safePayload.topic === "string" ? safePayload.topic : "";
  const resource = typeof safePayload.resource === "string" ? safePayload.resource : "";
  const mlUserId = safePayload.user_id !== undefined && safePayload.user_id !== null ? String(safePayload.user_id) : "";

  if (!SUPPORTED_TOPICS.has(topic) || !resource || !mlUserId) {
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        metadata: { payload: safePayload, reason: "ignored", topic, resource, mlUserId }
      }
    });
    return NextResponse.json({ ok: true });
  }

  const itemId = extractItemId(resource);
  if (!itemId) {
    await prisma.auditLog.create({
      data: {
        action: "ml:webhook",
        metadata: { payload: safePayload, reason: "no_item_id", resource }
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
          payload: safePayload,
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
          payload: safePayload,
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
          payload: safePayload,
          itemId,
          error: error?.message ?? "unknown"
        }
      }
    });
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook activo" });
}
