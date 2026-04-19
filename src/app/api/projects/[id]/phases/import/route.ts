import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isPM } from "@/lib/auth";
import { TaskStatus } from "@prisma/client";

interface ImportedTask {
  name: string;
  dueDate: string;
  status: string;
}

interface ImportedPhase {
  name: string;
  startDate: string;
  endDate: string;
  tasks: ImportedTask[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: projectId } = await params;

  if (!isPM(user, projectId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { phases, replace } = await req.json() as { phases: ImportedPhase[]; replace?: boolean };

  if (!Array.isArray(phases) || phases.length === 0) {
    return NextResponse.json({ error: "No phases provided" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (replace) {
      await tx.projectPhase.deleteMany({ where: { projectId } });
    }

    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      const phase = await tx.projectPhase.create({
        data: {
          projectId,
          name: p.name,
          startDate: p.startDate ? new Date(p.startDate) : new Date(),
          endDate: p.endDate ? new Date(p.endDate) : new Date(),
          sortOrder: i,
        },
      });

      for (const t of p.tasks) {
        const validStatus = (["not_started", "in_progress", "complete"].includes(t.status)
          ? t.status
          : "not_started") as TaskStatus;
        await tx.task.create({
          data: {
            phaseId: phase.id,
            name: t.name,
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            status: validStatus,
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true, count: phases.length });
}
