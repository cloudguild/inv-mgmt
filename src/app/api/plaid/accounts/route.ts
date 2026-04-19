import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid-client";
import { decrypt } from "@/lib/encrypt";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.plaidConnection.findMany({
    where: { userId: user.userId, status: "active" },
  });

  const allAccounts = [];
  for (const conn of connections) {
    const access_token = decrypt(conn.accessTokenEnc);
    const res = await plaidClient.accountsGet({ access_token });
    for (const acc of res.data.accounts) {
      allAccounts.push({
        connectionId: conn.id,
        institutionName: conn.institutionName,
        accountId: acc.account_id,
        name: acc.name,
        mask: acc.mask,
        type: acc.type,
        subtype: acc.subtype,
        balanceCurrent: acc.balances.current,
        balanceAvailable: acc.balances.available,
        isoCurrencyCode: acc.balances.iso_currency_code,
      });
    }
  }

  return NextResponse.json(allAccounts);
}
