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
  const docType = searchParams.get("docType");

  const docs = await prisma.vendorDocument.findMany({
    where: { vendorId, ...(docType ? { docType } : {}) },
    orderBy: { createdAt: "desc" },
    include: { uploader: { select: { id: true, name: true } } },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  const { id: vendorId } = await params;
  if (!actor || !await canAccess(actor, vendorId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { projectId: true } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await req.json();
  const doc = await prisma.vendorDocument.create({
    data: {
      vendorId,
      projectId: vendor.projectId,
      docType: data.docType,
      title: data.title,
      filename: data.filename,
      amount: data.amount ? data.amount : null,
      docDate: data.docDate ? new Date(data.docDate) : null,
      notes: data.notes || null,
      s3Key: data.s3Key || null,
      uploadedBy: actor.userId,
    },
    include: { uploader: { select: { id: true, name: true } } },
  });
  return NextResponse.json(doc, { status: 201 });
}
