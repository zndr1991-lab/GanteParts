export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const STATE_COOKIE = "ml_oauth_state";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

async function requestAccessToken(code: string) {
  const clientId = getEnv("ML_APP_ID");
  const clientSecret = getEnv("ML_APP_SECRET");
  const redirectUri = getEnv("ML_REDIRECT_URI");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Token exchange failed";
    throw new Error(message);
  }

  return payload as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
    user_id?: string | number;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Parametros incompletos" }, { status: 400 });
  }

  const cookieStore = cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!storedState || storedState !== state) {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sesion requerida" }, { status: 401 });
  }

  try {
    const tokenPayload = await requestAccessToken(code);
    const expiresBuffer = Math.max(tokenPayload.expires_in - 60, 60);
    const expiresAt = new Date(Date.now() + expiresBuffer * 1000);
    const mlUserId = String(tokenPayload.user_id ?? session.user.id);

    await prisma.mercadoLibreAccount.upsert({
      where: {
        userId_mlUserId: {
          userId: session.user.id,
          mlUserId
        }
      },
      update: {
        accessToken: tokenPayload.access_token,
        refreshToken: tokenPayload.refresh_token,
        scope: tokenPayload.scope ?? null,
        expiresAt
      },
      create: {
        userId: session.user.id,
        mlUserId,
        accessToken: tokenPayload.access_token,
        refreshToken: tokenPayload.refresh_token,
        scope: tokenPayload.scope ?? null,
        expiresAt
      }
    });

    const redirect = new URL("/inventory", url.origin);
    redirect.searchParams.set("mlLinked", "1");
    return NextResponse.redirect(redirect);
  } catch (error) {
    console.error("MercadoLibre OAuth error", error);
    return NextResponse.json({ error: "No se pudo vincular la cuenta" }, { status: 500 });
  }
}
