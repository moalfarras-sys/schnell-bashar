"use server";

import { prisma } from "@/server/db/prisma";

export async function updateCatalogItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.catalogItem.update({
    where: { id },
    data: {
      categoryKey: String(formData.get("categoryKey") ?? ""),
      nameDe: String(formData.get("nameDe") ?? ""),
      defaultVolumeM3: Number(formData.get("defaultVolumeM3") ?? 0),
      laborMinutesPerUnit: Number(formData.get("laborMinutesPerUnit") ?? 0),
      isHeavy: String(formData.get("isHeavy") ?? "") === "on",
      active: String(formData.get("active") ?? "") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    },
  });
}

export async function createCatalogItemAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const nameDe = String(formData.get("nameDe") ?? "").trim();
  const categoryKey = String(formData.get("categoryKey") ?? "").trim();
  if (!slug || !nameDe || !categoryKey) return;

  await prisma.catalogItem.create({
    data: {
      slug,
      nameDe,
      categoryKey,
      defaultVolumeM3: Number(formData.get("defaultVolumeM3") ?? 0),
      laborMinutesPerUnit: Number(formData.get("laborMinutesPerUnit") ?? 0),
      isHeavy: String(formData.get("isHeavy") ?? "") === "on",
      active: true,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    },
  });
}

