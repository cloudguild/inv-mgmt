import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const { id: projectId } = await params;

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user) && !isPM(user, projectId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
  const dateFilter = year
    ? { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) }
    : undefined;

  const [project, expenses, payouts, phases, vendors, transfers, lenders, investors] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true, name: true, type: true, budget: true, progressPct: true,
        ragStatus: true, startDate: true, endDate: true, description: true,
        _count: { select: { lendingPositions: true, equityPositions: true } },
      },
    }),
    prisma.expense.findMany({
      where: { projectId, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: "desc" },
      select: { id: true, date: true, amount: true, category: true, vendor: true, invoiceNumber: true, notes: true },
    }),
    prisma.payout.findMany({
      where: { projectId, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.projectPhase.findMany({
      where: { projectId },
      include: { tasks: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.vendor.findMany({
      where: { projectId, isActive: true },
      include: {
        _count: { select: { documents: true, transactions: true } },
        transactions: {
          where: dateFilter ? { date: dateFilter } : {},
          select: { amount: true, txType: true },
        },
      },
    }),
    prisma.fundTransfer.findMany({
      where: { projectId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.lendingPosition.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.equityPosition.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPayouts = payouts.reduce((s, p) => s + Number(p.amount), 0);
  const totalTransfersIn = transfers.filter((t) => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
  const totalTransfersOut = transfers.filter((t) => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);

  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  const taskStats = phases.reduce(
    (acc, ph) => {
      acc.total += ph.tasks.length;
      acc.complete += ph.tasks.filter((t) => t.status === "complete").length;
      return acc;
    },
    { total: 0, complete: 0 }
  );

  const vendorPayments = vendors.map((v) => ({
    id: v.id,
    companyName: v.companyName,
    vendorType: v.vendorType,
    totalPaid: v.transactions.filter((t) => t.txType === "payment").reduce((s, t) => s + Number(t.amount), 0),
    docCount: v._count.documents,
    txCount: v._count.transactions,
  }));

  return NextResponse.json({
    project,
    summary: { totalExpenses, totalPayouts, totalTransfersIn, totalTransfersOut, taskStats },
    expenses,
    expenseByCategory,
    payouts,
    phases,
    vendors: vendorPayments,
    transfers,
    lenders,
    investors,
  });
}
