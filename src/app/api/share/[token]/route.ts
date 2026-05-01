import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { presignedDownloadUrl } from "@/lib/s3";

// Public endpoint — no auth required. Token is a UUID stored on the Document.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const doc = await prisma.document.findUnique({ where: { shareToken: token } });
  if (!doc || !doc.s3Key) {
    return new NextResponse("Document not found or link is invalid.", { status: 404 });
  }

  // Generate presigned URL with 1-hour expiry and redirect browser to it
  const url = await presignedDownloadUrl(doc.s3Key, 3600);
  return NextResponse.redirect(url);
}
