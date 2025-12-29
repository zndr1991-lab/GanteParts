import type { MercadoLibreAccount } from "@prisma/client";
import { prisma } from "./prisma";

const API_BASE = "https://api.mercadolibre.com";
const TOKEN_URL = `${API_BASE}/oauth/token`;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export async function getMercadoLibreAccount(userId: string) {
  return prisma.mercadoLibreAccount.findFirst({ where: { userId } });
}

export async function getMercadoLibreAccountByMlUserId(mlUserId: string) {
  return prisma.mercadoLibreAccount.findFirst({ where: { mlUserId } });
}

async function refreshToken(accountId: string, refreshTokenValue: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshTokenValue,
    client_id: requiredEnv("ML_APP_ID"),
    client_secret: requiredEnv("ML_APP_SECRET")
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const payload = await resp.json();
  if (!resp.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Refresh failed";
    throw new Error(message);
  }

  const expiresBuffer = Math.max(payload.expires_in - 60, 60);
  const expiresAt = new Date(Date.now() + expiresBuffer * 1000);

  return prisma.mercadoLibreAccount.update({
    where: { id: accountId },
    data: {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? refreshTokenValue,
      scope: payload.scope ?? null,
      expiresAt
    }
  });
}

async function ensureFreshAccount(account: MercadoLibreAccount) {
  if (account.expiresAt.getTime() - Date.now() < 60_000) {
    return refreshToken(account.id, account.refreshToken);
  }
  return account;
}

export async function getValidAccessToken(userId: string) {
  const account = await getMercadoLibreAccount(userId);
  if (!account) {
    throw new Error("Cuenta de Mercado Libre no vinculada");
  }

  const fresh = await ensureFreshAccount(account);
  return fresh.accessToken;
}

export async function getValidAccessTokenByMlUserId(mlUserId: string) {
  const account = await getMercadoLibreAccountByMlUserId(mlUserId);
  if (!account) {
    throw new Error("Cuenta de Mercado Libre no vinculada");
  }

  const fresh = await ensureFreshAccount(account);
  return fresh.accessToken;
}

async function mlFetch(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML request failed: ${response.status} ${error}`);
  }

  return response.json();
}

export async function pauseItem(userId: string, itemId: string) {
  const token = await getValidAccessToken(userId);
  await mlFetch(token, `/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "paused" })
  });
}

export async function activateItem(userId: string, itemId: string) {
  const token = await getValidAccessToken(userId);
  await mlFetch(token, `/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "active" })
  });
}

export async function updateStock(userId: string, itemId: string, availableQuantity: number) {
  const token = await getValidAccessToken(userId);
  await mlFetch(token, `/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ available_quantity: availableQuantity })
  });
}

export async function fetchItemSnapshotByMlUserId(mlUserId: string, itemId: string) {
  const token = await getValidAccessTokenByMlUserId(mlUserId);
  return mlFetch(token, `/items/${itemId}`);
}
