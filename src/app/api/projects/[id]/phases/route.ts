import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isPM } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const phases = await prisma.projectPhase.findMany({
    where: { projectId: id },
    include: { tasks: { orderBy: { createdAt: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(phases);
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
  const phase = await prisma.projectPhase.create({
    data: {
      projectId: id,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      sortOrder: data.sortOrder || 0,
    },
    include: { tasks: true },
  });
  return NextResponse.json(phase, { status: 201 });
}
