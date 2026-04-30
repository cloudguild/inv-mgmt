import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM, hashPassword } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

const USER_SELECT = {
  id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
  roles: { include: { project: { select: { id: true, name: true } } } },
  _count: { select: { lendingPositions: true, equityPositions: true } },
};

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isAdmin(user)) {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  }

  if (isPM(user)) {
    const pmProjectIds = user.roles
      .filter((r) => r.role === "pm" && r.projectId)
      .map((r) => r.projectId as string);
    const users = await prisma.user.findMany({
      where: { roles: { some: { projectId: { in: pmProjectIds } } } },
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminActor = isAdmin(user);
  const pmActor = isPM(user);
  if (!adminActor && !pmActor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { name, email, phone, password, role, projectId, lenderData, investorData } = data;

  if (!adminActor && pmActor && projectId) {
    const pmProjects = user.roles
      .filter((r) => r.role === "pm" && r.projectId)
      .map((r) => r.projectId as string);
    if (!pmProjects.includes(projectId)) {
      return NextResponse.json({ error: "Forbidden: not your project" }, { status: 403 });
    }
  }
  if (!adminActor && role === "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passwordHash = await hashPassword(password || "ChangeMe123!");

  const newUser = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: email.toLowerCase() } });
    let targetUser = existing;

    if (!targetUser) {
      targetUser = await tx.user.create({
        data: { name, email: email.toLowerCase(), passwordHash, phone: phone || null },
      });
    }

    if (role) {
      const dupeCheck = await tx.role.findFirst({
        where: { userId: targetUser.id, role, projectId: projectId || null },
      });
      if (!dupeCheck) {
        await tx.role.create({
          data: { userId: targetUser.id, role, projectId: projectId || null },
        });
      }

      if (role === "lender" && lenderData && projectId) {
        await tx.lendingPosition.create({
          data: {
            userId: targetUser.id,
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
            userId: targetUser.id,
            projectId,
            amountInvested: investorData.amountInvested,
            equitySharePct: investorData.equitySharePct,
            projectedReturn: investorData.projectedReturn || null,
            notes: investorData.notes || null,
          },
        });
      }
    }

    return tx.user.findUnique({ where: { id: targetUser.id }, select: USER_SELECT });
  });

  const rawPassword = password || "ChangeMe123!";
  await sendWelcomeEmail(email.toLowerCase(), name, rawPassword).catch(() => {});
  return NextResponse.json(newUser, { status: 201 });
}
