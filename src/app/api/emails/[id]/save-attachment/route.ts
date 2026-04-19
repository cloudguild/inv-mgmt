import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encrypt";
import { refreshAccessToken, graphGet, graphGetBinary } from "@/lib/graph";
import { s3Key } from "@/lib/s3";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  if (!actor || (!isAdmin(actor) && !isPM(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: threadId } = await params;
  const { messageOutlookId, attachmentId, attachmentName, projectId, vendorId, docType } = await req.json();

  const dbUser = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!dbUser?.outlookRefreshToken) return NextResponse.json({ error: "Outlook not connected" }, { status: 400 });

  const tokens = await refreshAccessToken(decrypt(dbUser.outlookRefreshToken));
  if (tokens.refresh_token) {
    await prisma.user.update({ where: { id: actor.userId }, data: { outlookRefreshToken: encrypt(tokens.refresh_token) } });
  }

  // Get attachment metadata
  const att = await graphGet<GraphAttachment>(
    tokens.access_token,
    `/me/messages/${messageOutlookId}/attachments/${attachmentId}`
  );

  // Download content
  const content = await graphGetBinary(
    tokens.access_token,
    `/me/messages/${messageOutlookId}/attachments/${attachmentId}/$value`
  );

  const key = s3Key(vendorId ? `vendors/${vendorId}` : `projects/${projectId}/emails`, att.name);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: content,
    ContentType: att.contentType,
  }));

  // Save document record
  if (vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { projectId: true } });
    await prisma.vendorDocument.create({
      data: {
        vendorId,
        projectId: vendor?.projectId ?? projectId,
        docType: docType ?? "Other",
        title: att.name,
        filename: att.name,
        s3Key: key,
        uploadedBy: actor.userId,
      },
    });
  } else if (projectId) {
    await prisma.document.create({
      data: {
        projectId,
        userId: actor.userId,
        filename: att.name,
        docType: "agreement",
        s3Key: key,
      },
    });
  }

  // Mark thread as linked
  if (projectId) {
    await prisma.emailThread.update({ where: { id: threadId }, data: { projectId } });
  }

  return NextResponse.json({ ok: true, key });
}
