import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { createNotification, notifyProjectPartners } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (!isAdmin(user)) where.userId = user.userId;
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;

  const withdrawals = await prisma.withdrawalRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, bankName: true, accountLast4: true, nickname: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(withdrawals);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();

  // Verify bank account is verified and belongs to user
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: data.bankAccountId, userId: user.userId, verificationStatus: "verified" },
  });
  if (!bankAccount) {
    return NextResponse.json({ error: "Bank account not verified or not found" }, { status: 400 });
  }

  const withdrawal = await prisma.withdrawalRequest.create({
    data: {
      userId: user.userId,
      projectId: data.projectId,
      bankAccountId: data.bankAccountId,
      amount: data.amount,
      type: data.type,
      status: "pending",
      notes: data.notes,
    },
  });

  await createAuditLog(user.userId, "withdrawal_requested", "withdrawal_request", withdrawal.id, { amount: data.amount });

  // Notify PMs
  const pmRoles = await prisma.role.findMany({
    where: { projectId: data.projectId, role: { in: ["pm", "admin"] } },
    select: { userId: true },
  });
  for (const pm of pmRoles) {
    await createNotification(pm.userId, "withdrawal_request", "New Withdrawal Request", `A withdrawal request of $${data.amount} requires your approval.`);
  }

  // Notify partner
  await createNotification(user.userId, "withdrawal_submitted", "Withdrawal Request Submitted", `Your withdrawal request of $${data.amount} has been submitted and is pending approval.`);

  return NextResponse.json(withdrawal, { status: 201 });
}
