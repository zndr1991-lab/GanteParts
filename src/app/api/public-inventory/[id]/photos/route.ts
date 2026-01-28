export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getPublicInventoryPhotos } from "@/lib/public-inventory";

type Params = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: Params) {
  if (!params?.id) {
    return NextResponse.json({ message: "Item id is required" }, { status: 400 });
  }

  const photos = await getPublicInventoryPhotos(params.id);

  if (!photos) {
    return NextResponse.json({ message: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}
