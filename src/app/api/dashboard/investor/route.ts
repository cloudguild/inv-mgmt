import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await prisma.equityPosition.findMany({
    where: { userId: user.userId },
    include: {
      project: {
        include: {
          milestones: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  const recommendedProjects = await prisma.project.findMany({
    where: {
      isRecommended: true,
      isArchived: false,
      type: { in: ["equity", "both"] },
    },
    take: 3,
  });

  return NextResponse.json({ positions, recommendedProjects });
}
