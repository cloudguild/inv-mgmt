import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { presignedUploadUrl, s3Key } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, folder } = await req.json();
  if (!filename || !contentType || !folder) {
    return NextResponse.json({ error: "filename, contentType, folder required" }, { status: 400 });
  }

  const key = s3Key(folder, filename);
  const uploadUrl = await presignedUploadUrl(key, contentType);
  return NextResponse.json({ url: uploadUrl, key });
}
