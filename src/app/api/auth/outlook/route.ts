import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, verifyAccessToken } from "@/lib/auth";
import { getAuthUrl } from "@/lib/graph";

export async function GET(req: NextRequest) {
  // Try header auth first, then fall back to ?token= query param (needed for browser navigations)
  let user = await getAuthUser(req);
  if (!user) {
    const token = new URL(req.url).searchParams.get("token");
    if (token) user = verifyAccessToken(token);
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUrl = getAuthUrl(user.userId);
  return NextResponse.redirect(authUrl);
}
