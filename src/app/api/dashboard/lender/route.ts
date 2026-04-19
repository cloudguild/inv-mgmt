import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await prisma.lendingPosition.findMany({
    where: { userId: user.userId, status: "active" },
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
      type: { in: ["lending", "both"] },
    },
    take: 3,
  });

  return NextResponse.json({ positions, recommendedProjects });
}
