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
  const { id } = await params;
  if (!await canAccess(actor, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      _count: { select: { documents: true, transactions: true } },
    },
  });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vendor);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id } = await params;
  if (!await canAccess(actor, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
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
      isActive: data.isActive !== undefined ? data.isActive : undefined,
    },
    include: { _count: { select: { documents: true, transactions: true } } },
  });
  return NextResponse.json(vendor);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id } = await params;
  if (!await canAccess(actor, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.vendor.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
