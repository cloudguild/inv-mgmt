import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isPM } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const payouts = await prisma.payout.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      createdByUser: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(payouts);
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
  const payout = await prisma.payout.create({
    data: {
      projectId: id,
      userId: data.userId,
      date: new Date(data.date),
      amount: data.amount,
      type: data.type,
      reference: data.reference,
      notes: data.notes,
      createdBy: user.userId,
    },
  });

  // Create transaction record and notify partner
  await prisma.transaction.create({
    data: {
      userId: data.userId,
      projectId: id,
      type: "payout",
      amount: data.amount,
      status: "completed",
      reference: data.reference,
    },
  });

  await createNotification(
    data.userId,
    "payout",
    "Payout Processed",
    `A payout of $${data.amount} has been processed for your account.`
  );

  return NextResponse.json(payout, { status: 201 });
}
