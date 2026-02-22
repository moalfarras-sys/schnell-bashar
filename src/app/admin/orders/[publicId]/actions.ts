"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";

export async function updateOrderStatusAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!publicId || !status) return;

  await prisma.order.update({
    where: { publicId },
    data: { status: status as any },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${publicId}`);
}

export async function closeOrderAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const closeAs = String(formData.get("closeAs") ?? "DONE");
  if (!publicId) return;

  const finalStatus = closeAs === "CANCELLED" ? "CANCELLED" : "DONE";
  await prisma.order.update({
    where: { publicId },
    data: { status: finalStatus as any },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${publicId}`);
}

export async function softDeleteOrderAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  if (!publicId) return;

  await prisma.order.update({
    where: { publicId },
    data: {
      deletedAt: new Date(),
      deletedBy: "admin",
    },
  });

  revalidatePath("/admin/orders");
}

export async function restoreOrderAction(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  if (!publicId) return;

  await prisma.order.update({
    where: { publicId },
    data: {
      deletedAt: null,
      deletedBy: null,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${publicId}`);
}
