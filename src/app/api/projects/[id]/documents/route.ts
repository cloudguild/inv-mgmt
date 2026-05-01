import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { deleteObject } from "@/lib/s3";
import { randomUUID } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const docs = await prisma.document.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (!isAdmin(user) && !isPM(user, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename, docType, year, s3Key } = await req.json();

  const doc = await prisma.document.create({
    data: {
      projectId: id,
      userId: user.userId,
      filename,
      docType,
      year: year ? Number(year) : null,
      s3Key: s3Key || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json(doc, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { docId, action } = await req.json();
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });

  const doc = await prisma.document.findFirst({ where: { id: docId, projectId: id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "share") {
    const token = doc.shareToken ?? randomUUID();
    const updated = await prisma.document.update({
      where: { id: docId },
      data: { shareToken: token },
    });
    const { origin } = new URL(req.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    return NextResponse.json({ shareUrl: `${appUrl}/api/share/${updated.shareToken}` });
  }

  if (action === "unshare") {
    await prisma.document.update({ where: { id: docId }, data: { shareToken: null } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (!isAdmin(user) && !isPM(user, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });

  const doc = await prisma.document.findFirst({ where: { id: docId, projectId: id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.s3Key) await deleteObject(doc.s3Key).catch(() => {});
  await prisma.document.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
