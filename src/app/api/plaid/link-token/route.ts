import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid-client";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await plaidClient.linkTokenCreate({
    user: { client_user_id: user.userId },
    client_name: "Real Estate Investor Portal",
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: "en",
  });

  return NextResponse.json({ link_token: res.data.link_token });
}
