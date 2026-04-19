import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encrypt";
import { refreshAccessToken, graphPost } from "@/lib/graph";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthUser(req);
  if (!actor || (!isAdmin(actor) && !isPM(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: threadId } = await params;
  const { body, toEmail, subject } = await req.json();

  const thread = await prisma.emailThread.findFirst({ where: { id: threadId, userId: actor.userId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dbUser = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!dbUser?.outlookRefreshToken) return NextResponse.json({ error: "Outlook not connected" }, { status: 400 });

  const tokens = await refreshAccessToken(decrypt(dbUser.outlookRefreshToken));
  if (tokens.refresh_token) {
    await prisma.user.update({
      where: { id: actor.userId },
      data: { outlookRefreshToken: encrypt(tokens.refresh_token) },
    });
  }

  // Send via Graph
  await graphPost(tokens.access_token, "/me/sendMail", {
    message: {
      subject: subject ?? `Re: ${thread.subject}`,
      body: { contentType: "HTML", content: body },
      toRecipients: [{ emailAddress: { address: toEmail ?? thread.fromEmail } }],
      conversationId: thread.outlookThreadId,
    },
    saveToSentItems: true,
  });

  // Save the outbound message locally
  const msg = await prisma.emailMessage.create({
    data: {
      threadId,
      outlookMessageId: `out-${Date.now()}-${Math.random()}`,
      fromName: dbUser.name,
      fromEmail: dbUser.outlookEmail ?? dbUser.email,
      toEmail: toEmail ?? thread.fromEmail,
      bodyHtml: body,
      sentAt: new Date(),
      isOutbound: true,
    },
  });

  await prisma.emailThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });

  return NextResponse.json(msg, { status: 201 });
}
