import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isAdmin, isPM } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encrypt";
import { refreshAccessToken, graphGet } from "@/lib/graph";

interface GraphMessage {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { address: string } }[];
  body: { content: string; contentType: string };
  receivedDateTime: string;
  hasAttachments: boolean;
  conversationId: string;
  isRead: boolean;
}

interface GraphMessageList {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
}

async function getAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.outlookRefreshToken) return null;
  const tokens = await refreshAccessToken(decrypt(user.outlookRefreshToken));
  // Update refresh token if rotated
  if (tokens.refresh_token) {
    await prisma.user.update({
      where: { id: userId },
      data: { outlookRefreshToken: encrypt(tokens.refresh_token) },
    });
  }
  return tokens.access_token;
}

export async function GET(req: NextRequest) {
  const actor = await getAuthUser(req);
  if (!actor || (!isAdmin(actor) && !isPM(actor))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sync = searchParams.get("sync") === "1";

  const dbUser = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!dbUser?.outlookRefreshToken) {
    return NextResponse.json({ connected: false, threads: [] });
  }

  if (sync) {
    try {
      const accessToken = await getAccessToken(actor.userId);
      if (!accessToken) return NextResponse.json({ connected: false, threads: [] });

      const data = await graphGet<GraphMessageList>(
        accessToken,
        "/me/messages?$top=50&$orderby=receivedDateTime%20desc&$select=id,subject,from,toRecipients,body,receivedDateTime,hasAttachments,conversationId,isRead"
      );

      for (const msg of data.value) {
        const thread = await prisma.emailThread.upsert({
          where: { outlookThreadId: msg.conversationId },
          create: {
            userId: actor.userId,
            outlookThreadId: msg.conversationId,
            subject: msg.subject || "(no subject)",
            fromEmail: msg.from.emailAddress.address,
            fromName: msg.from.emailAddress.name,
            lastMessageAt: new Date(msg.receivedDateTime),
            hasAttachments: msg.hasAttachments,
            isRead: msg.isRead,
          },
          update: {
            lastMessageAt: new Date(msg.receivedDateTime),
            hasAttachments: msg.hasAttachments,
            isRead: msg.isRead,
            messageCount: { increment: 0 },
          },
        });

        await prisma.emailMessage.upsert({
          where: { outlookMessageId: msg.id },
          create: {
            threadId: thread.id,
            outlookMessageId: msg.id,
            fromName: msg.from.emailAddress.name,
            fromEmail: msg.from.emailAddress.address,
            toEmail: msg.toRecipients.map((r) => r.emailAddress.address).join(", "),
            bodyHtml: msg.body.contentType === "html" ? msg.body.content : "",
            bodyText: msg.body.contentType === "text" ? msg.body.content : undefined,
            sentAt: new Date(msg.receivedDateTime),
            isOutbound: false,
          },
          update: {},
        });
      }
    } catch {
      // Sync failure is non-fatal — return cached data
    }
  }

  const threads = await prisma.emailThread.findMany({
    where: { userId: actor.userId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
    take: 100,
  });

  return NextResponse.json({ connected: true, outlookEmail: dbUser.outlookEmail, threads });
}
