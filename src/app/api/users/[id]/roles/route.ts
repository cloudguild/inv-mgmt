import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";

async function canManage(actor: Awaited<ReturnType<typeof getAuthUser>>, projectId?: string | null) {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  if (isPM(actor) && projectId) {
    return actor.roles.some((r) => r.role === "pm" && r.projectId === projectId);
  }
  return false;
}

// POST — add a role (+ optional position data) to user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthUser(req);
  const { id: userId } = await params;
  const data = await req.json();
  const { role, projectId, lenderData, investorData } = data;

  if (!actor || !(await canManage(actor, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin(actor) && role === "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.role.findFirst({
      where: { userId, role, projectId: projectId || null },
    });
    const newRole = existing ?? await tx.role.create({
      data: { userId, role, projectId: projectId || null },
    });

    if (role === "lender" && lenderData && projectId) {
      await tx.lendingPosition.create({
        data: {
          userId,
          projectId,
          principal: lenderData.principal,
          apr: lenderData.apr,
          startDate: new Date(lenderData.startDate),
          maturityDate: new Date(lenderData.maturityDate),
          notes: lenderData.notes || null,
        },
      });
    }

    if (role === "investor" && investorData && projectId) {
      await tx.equityPosition.create({
        data: {
          userId,
          projectId,
          amountInvested: investorData.amountInvested,
          equitySharePct: investorData.equitySharePct,
          projectedReturn: investorData.projectedReturn || null,
          notes: investorData.notes || null,
        },
      });
    }

    return newRole;
  });

  return NextResponse.json(result, { status: 201 });
}

// DELETE — remove a role by roleId (query param)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthUser(req);
  const { id: userId } = await params;
  const { searchParams } = new URL(req.url);
  const roleId = searchParams.get("roleId");

  if (!roleId) return NextResponse.json({ error: "roleId required" }, { status: 400 });

  const roleRow = await prisma.role.findUnique({ where: { id: roleId } });
  if (!roleRow || roleRow.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!actor || !(await canManage(actor, roleRow.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.role.delete({ where: { id: roleId } });
  return NextResponse.json({ ok: true });
}
