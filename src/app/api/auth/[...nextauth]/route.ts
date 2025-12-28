export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const runtime = "nodejs";
import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth";

console.log("Entrando a /api/auth/[...nextauth]/route.ts");
console.log("authOptions.providers:", authOptions.providers?.length);

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
