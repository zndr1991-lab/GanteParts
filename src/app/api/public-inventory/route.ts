import { NextResponse } from "next/server";

import { getPublicInventoryPage } from "@/lib/public-inventory";

const DEFAULT_PAGE_SIZE = 48;
const MAX_PAGE_SIZE = 120;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parsePagination = (searchParams: URLSearchParams) => {
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const rawSize = Number.parseInt(searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`, 10);

  const page = clamp(Number.isNaN(rawPage) ? 1 : rawPage, 1, 1000);
  const pageSize = clamp(Number.isNaN(rawSize) ? DEFAULT_PAGE_SIZE : rawSize, 1, MAX_PAGE_SIZE);

  return { page, pageSize };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);

  const result = await getPublicInventoryPage(page, pageSize);

  return NextResponse.json(result);
}
