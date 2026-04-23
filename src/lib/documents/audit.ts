import { writeAuditLog } from "@/server/audit/log";

export async function writeDocumentAuditLog(input: {
  actorUserId?: string | null;
  action: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await writeAuditLog({
    actorUserId: input.actorUserId ?? undefined,
    action: input.action,
    entityType: "Document",
    entityId: input.entityId ?? undefined,
    before: (input.before as Record<string, unknown> | undefined) ?? undefined,
    after: (input.after as Record<string, unknown> | undefined) ?? undefined,
  });
}
