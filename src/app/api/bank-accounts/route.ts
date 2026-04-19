import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || user.userId;

  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    select: {
      id: true,
      accountHolder: true,
      bankName: true,
      accountType: true,
      routingLast4: true,
      accountLast4: true,
      nickname: true,
      isPrimary: true,
      verificationStatus: true,
      verifiedAt: true,
      createdAt: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const { routingNumber, accountNumber, ...rest } = data;

  if (!routingNumber || !accountNumber) {
    return NextResponse.json({ error: "Routing and account numbers required" }, { status: 400 });
  }

  const routingEncrypted = encrypt(routingNumber);
  const accountEncrypted = encrypt(accountNumber);
  const routingLast4 = routingNumber.slice(-4);
  const accountLast4 = accountNumber.slice(-4);

  const account = await prisma.bankAccount.create({
    data: {
      userId: user.userId,
      accountHolder: rest.accountHolder,
      bankName: rest.bankName,
      accountType: rest.accountType,
      routingLast4,
      accountLast4,
      routingEncrypted,
      accountEncrypted,
      nickname: rest.nickname,
      isPrimary: rest.isPrimary || false,
    },
    select: {
      id: true,
      accountHolder: true,
      bankName: true,
      accountType: true,
      routingLast4: true,
      accountLast4: true,
      nickname: true,
      isPrimary: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  await createAuditLog(user.userId, "bank_account_added", "bank_account", account.id);
  return NextResponse.json(account, { status: 201 });
}
