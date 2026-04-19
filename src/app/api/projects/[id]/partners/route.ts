import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const roles = await prisma.role.findMany({
    where: { projectId: id, role: { in: ["lender", "investor"] } },
    include: {
      user: {
        include: {
          lendingPositions: { where: { projectId: id } },
          equityPositions: { where: { projectId: id } },
          bankAccounts: true,
          withdrawalRequests: { where: { projectId: id }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  // Group by user
  const partnersMap = new Map<string, { user: typeof roles[0]["user"]; roles: string[] }>();
  for (const r of roles) {
    const existing = partnersMap.get(r.userId);
    if (existing) {
      existing.roles.push(r.role);
    } else {
      partnersMap.set(r.userId, { user: r.user, roles: [r.role] });
    }
  }

  return NextResponse.json(Array.from(partnersMap.values()));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const data = await req.json();
  const role = await prisma.role.create({
    data: { userId: data.userId, projectId: id, role: data.role },
  });

  if (data.role === "lender" && data.lenderData) {
    await prisma.lendingPosition.create({
      data: {
        userId: data.userId,
        projectId: id,
        principal: data.lenderData.principal,
        apr: data.lenderData.apr,
        startDate: new Date(data.lenderData.startDate),
        maturityDate: new Date(data.lenderData.maturityDate),
      },
    });
  }

  if (data.role === "investor" && data.investorData) {
    await prisma.equityPosition.create({
      data: {
        userId: data.userId,
        projectId: id,
        amountInvested: data.investorData.amountInvested,
        equitySharePct: data.investorData.equitySharePct,
        projectedReturn: data.investorData.projectedReturn,
      },
    });
  }

  return NextResponse.json(role, { status: 201 });
}
