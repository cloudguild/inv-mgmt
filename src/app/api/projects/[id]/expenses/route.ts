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

  const expenses = await prisma.expense.findMany({
    where: { projectId: id },
    include: { createdByUser: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
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
  const expense = await prisma.expense.create({
    data: {
      projectId: id,
      date: new Date(data.date),
      amount: data.amount,
      category: data.category,
      vendor: data.vendor,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      createdBy: user.userId,
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
