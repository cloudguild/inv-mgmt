import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const dateFilter = year
    ? { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) }
    : undefined;

  const [lendingPositions, equityPositions, payouts, documents, transfers] = await Promise.all([
    prisma.lendingPosition.findMany({
      where: { userId: user.userId },
      include: { project: { select: { id: true, name: true, ragStatus: true } } },
    }),
    prisma.equityPosition.findMany({
      where: { userId: user.userId },
      include: { project: { select: { id: true, name: true, ragStatus: true } } },
    }),
    prisma.payout.findMany({
      where: { userId: user.userId, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: "desc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.document.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true } } },
    }),
    prisma.fundTransfer.findMany({
      where: { userId: user.userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true } } },
    }),
  ]);

  const totalLent = lendingPositions.reduce((s, p) => s + Number(p.principal), 0);
  const totalEquity = equityPositions.reduce((s, p) => s + Number(p.amountInvested), 0);
  const totalReceived = payouts.reduce((s, p) => s + Number(p.amount), 0);

  // Projected interest per lending position
  const lendingWithProjections = lendingPositions.map((lp) => {
    const principal = Number(lp.principal);
    const apr = Number(lp.apr);
    const start = new Date(lp.startDate);
    const end = new Date(lp.maturityDate);
    const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
    const projectedInterest = principal * apr * years;
    return { ...lp, projectedInterest };
  });

  // Year-over-year payout totals
  const payoutsByYear = payouts.reduce<Record<number, number>>((acc, p) => {
    const y = new Date(p.date).getFullYear();
    acc[y] = (acc[y] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  return NextResponse.json({
    summary: { totalLent, totalEquity, totalCapital: totalLent + totalEquity, totalReceived },
    lendingPositions: lendingWithProjections,
    equityPositions,
    payouts,
    payoutsByYear,
    documents,
    transfers,
  });
}
