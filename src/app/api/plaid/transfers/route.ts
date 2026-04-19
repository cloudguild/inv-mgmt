import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid-client";
import { decrypt } from "@/lib/encrypt";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where = isAdmin(user) || isPM(user)
    ? (projectId ? { projectId } : {})
    : { userId: user.userId };

  const transfers = await prisma.fundTransfer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(transfers);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { connectionId, accountId, projectId, type, amount, description } = await req.json();

  const conn = await prisma.plaidConnection.findFirst({
    where: { id: connectionId, userId: user.userId },
  });
  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const access_token = decrypt(conn.accessTokenEnc);
  const network = "ach";
  const plaidType = type === "deposit" ? "credit" : "debit";

  // Create authorization
  const authRes = await plaidClient.transferAuthorizationCreate({
    access_token,
    account_id: accountId,
    type: plaidType,
    network,
    amount: amount.toString(),
    ach_class: "ppd",
    user: { legal_name: (await prisma.user.findUnique({ where: { id: user.userId } }))?.name ?? "" },
  });

  if (authRes.data.authorization.decision !== "approved") {
    return NextResponse.json({ error: `Transfer not authorized: ${authRes.data.authorization.decision_rationale?.description}` }, { status: 400 });
  }

  // Create transfer
  const transferRes = await plaidClient.transferCreate({
    access_token,
    account_id: accountId,
    authorization_id: authRes.data.authorization.id,
    description: description ?? `${type} for project`,
    amount: amount.toString(),
    network,
    type: plaidType,
    ach_class: "ppd",
    user: { legal_name: "" },
  });

  const ft = await prisma.fundTransfer.create({
    data: {
      userId: user.userId,
      projectId,
      plaidConnectionId: connectionId,
      type,
      amount,
      status: "processing",
      plaidTransferId: transferRes.data.transfer.id,
      description,
    },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(ft, { status: 201 });
}
