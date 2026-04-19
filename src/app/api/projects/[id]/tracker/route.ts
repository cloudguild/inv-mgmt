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

  const updates = await prisma.trackerUpdate.findMany({
    where: { projectId: id },
    include: { createdByUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(updates);
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
  const update = await prisma.trackerUpdate.create({
    data: {
      projectId: id,
      title: data.title,
      updateType: data.updateType,
      status: data.status || "open",
      notes: data.notes,
      notifyPartners: data.notifyPartners || false,
      createdBy: user.userId,
    },
    include: { createdByUser: { select: { id: true, name: true } } },
  });

  if (data.notifyPartners) {
    await notifyProjectPartners(
      id,
      "tracker_update",
      `Project Update: ${data.title}`,
      data.notes || data.title
    );
  }

  return NextResponse.json(update, { status: 201 });
}
