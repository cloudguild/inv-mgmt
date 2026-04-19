import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { notifyProjectPartners } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      phases: {
        include: { tasks: { orderBy: { createdAt: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
      expenses: { orderBy: { date: "desc" } },
      payouts: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { date: "desc" } },
      contracts: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      trackerUpdates: { include: { createdByUser: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      financialModel: { orderBy: { sortOrder: "asc" } },
      lendingPositions: { include: { user: { select: { id: true, name: true, email: true } } } },
      equityPositions: { include: { user: { select: { id: true, name: true, email: true } } } },
      roles: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (!isAdmin(user) && !isPM(user, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      type: data.type ?? existing.type,
      budget: data.budget ?? existing.budget,
      targetReturn: data.targetReturn ?? existing.targetReturn,
      startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
      endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
      progressPct: data.progressPct ?? existing.progressPct,
      ragStatus: data.ragStatus ?? existing.ragStatus,
      isRecommended: data.isRecommended ?? existing.isRecommended,
      isArchived: data.isArchived ?? existing.isArchived,
    },
  });

  if (data.ragStatus && data.ragStatus !== existing.ragStatus) {
    await notifyProjectPartners(
      id,
      "rag_status_change",
      `Project RAG Status Updated: ${project.name}`,
      `The RAG status for ${project.name} has changed to ${data.ragStatus.toUpperCase()}.`
    );
  }

  return NextResponse.json(project);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.project.update({ where: { id }, data: { isArchived: true } });
  return NextResponse.json({ success: true });
}
