export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const AUTH_URL = "https://auth.mercadolibre.com.mx/authorization";
const STATE_COOKIE = "ml_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const clientId = getEnv("ML_APP_ID");
  const redirectUri = getEnv("ML_REDIRECT_URI");
  const scopes = ["read", "write", "offline_access"].join(" ");

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: STATE_TTL_SECONDS,
    path: "/"
  });

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
