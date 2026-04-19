import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const account = await prisma.bankAccount.findFirst({
    where: { id, userId: user.userId },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { amount1, amount2 } = await req.json();
  // Simulate micro-deposit verification (in production, verify against actual deposits)
  const isValid = amount1 > 0 && amount2 > 0 && amount1 !== amount2;

  const status = isValid ? "verified" : "failed";
  const updated = await prisma.bankAccount.update({
    where: { id },
    data: {
      verificationStatus: status,
      verifiedAt: isValid ? new Date() : null,
    },
  });

  await createNotification(
    user.userId,
    "bank_account_verification",
    isValid ? "Bank Account Verified" : "Bank Account Verification Failed",
    isValid
      ? `Your bank account ending in ${account.accountLast4} has been verified.`
      : `Verification failed for account ending in ${account.accountLast4}. Please try again.`
  );

  await createAuditLog(user.userId, `bank_account_${status}`, "bank_account", id);
  return NextResponse.json(updated);
}
