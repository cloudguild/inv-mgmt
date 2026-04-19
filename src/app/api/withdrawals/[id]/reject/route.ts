import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isPM } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isPM(user, withdrawal.projectId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Request is not in pending state" }, { status: 400 });
  }

  const { rejectionReason, pmNote } = await req.json();

  const updated = await prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status: "rejected",
      approvedBy: user.userId,
      approvedAt: new Date(),
      rejectionReason,
      pmNote,
    },
  });

  await createAuditLog(user.userId, "withdrawal_rejected", "withdrawal_request", id, { rejectionReason });
  await createNotification(
    withdrawal.userId,
    "withdrawal_rejected",
    "Withdrawal Request Rejected",
    `Your withdrawal request of $${withdrawal.amount} has been rejected. Reason: ${rejectionReason}`
  );

  return NextResponse.json(updated);
}
