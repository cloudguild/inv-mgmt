import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthUrl } from "@/lib/graph";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUrl = getAuthUrl(user.userId);
  return NextResponse.redirect(authUrl);
}
