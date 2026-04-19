import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "true";

  if (isAdmin(user)) {
    const projects = await prisma.project.findMany({
      where: includeArchived ? {} : { isArchived: false },
      include: {
        _count: { select: { roles: true, lendingPositions: true, equityPositions: true } },
        milestones: { orderBy: { sortOrder: "asc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  }

  const userRoles = await prisma.role.findMany({
    where: { userId: user.userId },
    select: { projectId: true },
  });
  const projectIds = userRoles
    .map((r) => r.projectId)
    .filter((id): id is string => id !== null);

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds }, isArchived: false },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      lendingPositions: { where: { userId: user.userId } },
      equityPositions: { where: { userId: user.userId } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      budget: data.budget,
      targetReturn: data.targetReturn,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      ragStatus: data.ragStatus || "green",
      isRecommended: data.isRecommended || false,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
