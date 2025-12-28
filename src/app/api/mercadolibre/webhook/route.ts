export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function verifySecret(req: Request) {
  const provided = req.headers.get("x-ml-signature") || "";
  const expected = process.env.ML_WEBHOOK_SECRET || "";
  return expected.length > 0 && provided === expected;
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Payload invalido" }, { status: 400 });

  await prisma.auditLog.create({
    data: {
      action: "ml:webhook",
      metadata: payload
    }
  });

  return NextResponse.json({ ok: true });
}
