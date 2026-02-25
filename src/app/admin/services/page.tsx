import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { requireAdminPermission } from "@/server/auth/require-admin";
import { ServicesAdminClient } from "./services-client";

export default async function ServicesAdminPage() {
  const allowed = await requireAdminPermission("services.read");
  if (!allowed.ok) redirect("/admin?denied=1");

  const [modules, promoRules] = await Promise.all([
    prisma.serviceModule.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        options: {
          orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
        },
      },
    }),
    prisma.promoRule.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        module: {
          select: { id: true, slug: true, nameDe: true },
        },
      },
    }),
  ]);

  return <ServicesAdminClient initialModules={modules} initialPromoRules={promoRules} />;
}
