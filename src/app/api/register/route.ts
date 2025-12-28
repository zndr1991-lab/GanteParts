export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.string().default("operator")
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = payloadSchema.parse(data);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya existe" }, { status: 400 });
    }

    const passwordHash = await hash(parsed.password, 10);
    await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        name: parsed.name,
        role: parsed.role
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("register error", error);
    return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
  }
}
