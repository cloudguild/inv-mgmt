import { prisma } from "./prisma";

export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any
) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, details },
  });
}
