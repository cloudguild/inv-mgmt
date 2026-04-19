import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isPM } from "@/lib/auth";
import { notifyProjectPartners } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const milestones = await prisma.milestone.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(milestones);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (!isPM(user, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const milestone = await prisma.milestone.create({
    data: {
      projectId: id,
      name: data.name,
      targetDate: new Date(data.targetDate),
      sortOrder: data.sortOrder || 0,
    },
  });

  if (data.completedAt) {
    const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
    await notifyProjectPartners(
      id,
      "milestone_complete",
      `Milestone Completed: ${data.name}`,
      `The milestone "${data.name}" for project ${project?.name} has been completed.`
    );
  }

  return NextResponse.json(milestone, { status: 201 });
}
