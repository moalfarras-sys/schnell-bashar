import { prisma } from "@/server/db/prisma";

export async function writeAuditLog(params: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  path?: string;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        before: params.before as any,
        after: params.after as any,
        path: params.path,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write log", error);
  }
}

