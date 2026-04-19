import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCode, graphGet } from "@/lib/graph";
import { encrypt } from "@/lib/encrypt";

interface GraphUser { mail: string; userPrincipalName: string; displayName: string }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${APP_URL}/admin/emails?error=oauth_failed`);
  }

  try {
    const tokens = await exchangeCode(code);
    const me = await graphGet<GraphUser>(tokens.access_token, "/me");

    await prisma.user.update({
      where: { id: userId },
      data: {
        outlookRefreshToken: encrypt(tokens.refresh_token),
        outlookEmail: me.mail ?? me.userPrincipalName,
        outlookLinkedAt: new Date(),
      },
    });

    return NextResponse.redirect(`${APP_URL}/admin/emails?connected=1`);
  } catch {
    return NextResponse.redirect(`${APP_URL}/admin/emails?error=token_exchange`);
  }
}
