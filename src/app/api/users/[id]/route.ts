import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM, hashPassword } from "@/lib/auth";

const USER_SELECT = {
  id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
  roles: {
    include: {
      project: { select: { id: true, name: true } },
    },
  },
  lendingPositions: true,
  equityPositions: true,
};

async function canManage(actor: Awaited<ReturnType<typeof getAuthUser>>, targetUserId: string) {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  if (isPM(actor)) {
    const pmProjectIds = actor.roles
      .filter((r) => r.role === "pm" && r.projectId)
      .map((r) => r.projectId as string);
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { roles: { select: { projectId: true } } },
    });
    return target?.roles.some((r) => r.projectId && pmProjectIds.includes(r.projectId)) ?? false;
  }
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthUser(req);
  const { id } = await params;
  if (!actor || !(await canManage(actor, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const u = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(u);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthUser(req);
  const { id } = await params;
  if (!actor || !(await canManage(actor, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await hashPassword(data.password);

  const u = await prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_SELECT,
  });
  return NextResponse.json(u);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getAuthUser(req);
  const { id } = await params;
  if (!actor || !isAdmin(actor)) {
    return NextResponse.json({ error: "Forbidden — only admin can delete users" }, { status: 403 });
  }
  // Soft-delete: deactivate instead of hard delete
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
