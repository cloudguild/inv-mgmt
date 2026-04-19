import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string
) {
  return prisma.notification.create({
    data: { userId, type, title, body },
  });
}

export async function notifyProjectPartners(
  projectId: string,
  type: string,
  title: string,
  body: string
) {
  const roles = await prisma.role.findMany({
    where: { projectId, role: { in: ["lender", "investor"] } },
    select: { userId: true },
  });
  const uniqueUserIds = [...new Set(roles.map((r) => r.userId))];
  await prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({ userId, type, title, body })),
  });
}
