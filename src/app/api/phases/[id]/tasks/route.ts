import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const data = await req.json();
  const task = await prisma.task.create({
    data: {
      phaseId: id,
      name: data.name,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status || "not_started",
    },
  });

  // Update phase completion
  await updatePhaseAndProjectProgress(id);

  return NextResponse.json(task, { status: 201 });
}

async function updatePhaseAndProjectProgress(phaseId: string) {
  const tasks = await prisma.task.findMany({ where: { phaseId } });
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "complete").length;

  const phaseStatus = total === 0 ? "not_started"
    : completed === total ? "complete"
    : completed > 0 ? "in_progress"
    : "not_started";

  const phase = await prisma.projectPhase.update({
    where: { id: phaseId },
    data: { status: phaseStatus },
  });

  // Update overall project progress
  const allPhases = await prisma.projectPhase.findMany({
    where: { projectId: phase.projectId },
    include: { tasks: true },
  });

  const allTasks = allPhases.flatMap((p) => p.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "complete").length;
  const progressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  await prisma.project.update({
    where: { id: phase.projectId },
    data: { progressPct },
  });
}
