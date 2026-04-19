import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { presignedDownloadUrl } from "@/lib/s3";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const url = await presignedDownloadUrl(key);
  return NextResponse.json({ url });
}
