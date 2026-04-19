import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;

  const dateFilter = year
    ? { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) }
    : undefined;

  const [projects, expenses, payouts, lendingPositions, equityPositions, transfers] = await Promise.all([
    prisma.project.findMany({
      where: { isArchived: false },
      select: {
        id: true, name: true, type: true, budget: true, progressPct: true, ragStatus: true,
        startDate: true, endDate: true,
        _count: { select: { lendingPositions: true, equityPositions: true, vendors: true } },
        expenses: {
          where: dateFilter ? { date: dateFilter } : {},
          select: { amount: true, category: true },
        },
        payouts: {
          where: dateFilter ? { date: dateFilter } : {},
          select: { amount: true, type: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: dateFilter ? { date: dateFilter } : {},
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.payout.groupBy({
      by: ["type"],
      where: dateFilter ? { date: dateFilter } : {},
      _sum: { amount: true },
    }),
    prisma.lendingPosition.findMany({
      select: {
        id: true, principal: true, apr: true, startDate: true, maturityDate: true, status: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.equityPosition.findMany({
      select: {
        id: true, amountInvested: true, equitySharePct: true, projectedReturn: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.fundTransfer.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: { amount: true, type: true, status: true, project: { select: { name: true } } },
    }),
  ]);

  const totalCapitalDeployed = lendingPositions.reduce((s, p) => s + Number(p.principal), 0)
    + equityPositions.reduce((s, p) => s + Number(p.amountInvested), 0);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e._sum.amount ?? 0), 0);
  const totalPayouts = payouts.reduce((s, p) => s + Number(p._sum.amount ?? 0), 0);

  return NextResponse.json({
    summary: {
      totalProjects: projects.length,
      totalCapitalDeployed,
      totalExpenses,
      totalPayouts,
      totalLenders: new Set(lendingPositions.map((p) => p.user.id)).size,
      totalInvestors: new Set(equityPositions.map((p) => p.user.id)).size,
    },
    projects: projects.map((p) => ({
      ...p,
      totalExpenses: p.expenses.reduce((s, e) => s + Number(e.amount), 0),
      totalPayouts: p.payouts.reduce((s, py) => s + Number(py.amount), 0),
    })),
    expensesByCategory: expenses,
    payoutsByType: payouts,
    lendingPositions,
    equityPositions,
    transfers,
  });
}
