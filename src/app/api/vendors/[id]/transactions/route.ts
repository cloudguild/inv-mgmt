import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";

async function canAccess(actor: Awaited<ReturnType<typeof getAuthUser>>, vendorId: string) {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { projectId: true } });
  if (!vendor) return false;
  return isPM(actor, vendor.projectId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id: vendorId } = await params;
  if (!await canAccess(actor, vendorId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const txType = searchParams.get("txType");

  const txs = await prisma.vendorTransaction.findMany({
    where: {
      vendorId,
      ...(txType ? { txType } : {}),
      ...(dateFrom || dateTo ? {
        date: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
      ...(search ? {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { reference: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { date: "desc" },
    include: { creator: { select: { id: true, name: true } } },
  });
  return NextResponse.json(txs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id: vendorId } = await params;
  if (!actor || !await canAccess(actor, vendorId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { projectId: true } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await req.json();
  const tx = await prisma.vendorTransaction.create({
    data: {
      vendorId,
      projectId: vendor.projectId,
      date: new Date(data.date),
      amount: data.amount,
      txType: data.txType,
      description: data.description || null,
      reference: data.reference || null,
      createdBy: actor.userId,
    },
    include: { creator: { select: { id: true, name: true } } },
  });
  return NextResponse.json(tx, { status: 201 });
}
