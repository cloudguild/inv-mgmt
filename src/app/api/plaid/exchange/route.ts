import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid-client";
import { encrypt } from "@/lib/encrypt";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { public_token } = await req.json();
  const tokenRes = await plaidClient.itemPublicTokenExchange({ public_token });
  const { access_token, item_id } = tokenRes.data;

  const itemRes = await plaidClient.itemGet({ access_token });
  const institutionId = itemRes.data.item.institution_id;

  let institutionName: string | undefined;
  if (institutionId) {
    const instRes = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"],
    });
    institutionName = instRes.data.institution.name;
  }

  const conn = await prisma.plaidConnection.upsert({
    where: { plaidItemId: item_id },
    create: {
      userId: user.userId,
      plaidItemId: item_id,
      accessTokenEnc: encrypt(access_token),
      institutionId: institutionId ?? undefined,
      institutionName,
    },
    update: {
      accessTokenEnc: encrypt(access_token),
      status: "active",
    },
  });

  return NextResponse.json({ ok: true, connectionId: conn.id, institutionName });
}
