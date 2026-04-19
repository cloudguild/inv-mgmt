import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  if (!actor || (!isAdmin(actor) && !isPM(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const thread = await prisma.emailThread.findFirst({
    where: { id, userId: actor.userId },
    include: {
      messages: { orderBy: { sentAt: "asc" } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark as read
  if (!thread.isRead) await prisma.emailThread.update({ where: { id }, data: { isRead: true } });

  return NextResponse.json(thread);
}

// PATCH: link to project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  if (!actor || (!isAdmin(actor) && !isPM(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { projectId } = await req.json();

  const thread = await prisma.emailThread.update({
    where: { id },
    data: { projectId: projectId || null },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json(thread);
}
