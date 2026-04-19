import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  generateAccessToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token required" }, { status: 400 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { roles: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((r) => ({ role: r.role, projectId: r.projectId })),
    };
    const accessToken = generateAccessToken(newPayload);

    return NextResponse.json({ accessToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
