import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";

function canAccess(actor: Awaited<ReturnType<typeof getAuthUser>>, projectId: string) {
  if (!actor) return false;
  if (isAdmin(actor)) return true;
  return isPM(actor, projectId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id: projectId } = await params;
  if (!canAccess(actor, projectId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vendors = await prisma.vendor.findMany({
    where: { projectId },
    orderBy: { companyName: "asc" },
    include: {
      _count: { select: { documents: true, transactions: true } },
    },
  });
  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id: projectId } = await params;
  if (!canAccess(actor, projectId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const vendor = await prisma.vendor.create({
    data: {
      projectId,
      companyName: data.companyName,
      vendorType: data.vendorType,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      taxId: data.taxId || null,
      licenseNo: data.licenseNo || null,
      website: data.website || null,
      notes: data.notes || null,
    },
    include: { _count: { select: { documents: true, transactions: true } } },
  });
  return NextResponse.json(vendor, { status: 201 });
}
