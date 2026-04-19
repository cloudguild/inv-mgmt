import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const actor = await getAuthUser(req);
  const { id: vendorId, docId } = await params;
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.vendorDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.vendorId !== vendorId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { projectId: true } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin(actor) && !isPM(actor, vendor.projectId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.vendorDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
