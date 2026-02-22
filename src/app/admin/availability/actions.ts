"use server";

import { prisma } from "@/server/db/prisma";

export async function updateAvailabilityRuleAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.availabilityRule.update({
    where: { id },
    data: {
      dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
      startTime: String(formData.get("startTime") ?? "08:00"),
      endTime: String(formData.get("endTime") ?? "18:00"),
      slotMinutes: Number(formData.get("slotMinutes") ?? 60),
      capacity: Number(formData.get("capacity") ?? 1),
      active: String(formData.get("active") ?? "") === "on",
    },
  });
}

export async function createAvailabilityRuleAction(formData: FormData) {
  await prisma.availabilityRule.create({
    data: {
      dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
      startTime: String(formData.get("startTime") ?? "08:00"),
      endTime: String(formData.get("endTime") ?? "18:00"),
      slotMinutes: Number(formData.get("slotMinutes") ?? 60),
      capacity: Number(formData.get("capacity") ?? 1),
      active: true,
    },
  });
}

export async function createAvailabilityExceptionAction(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  if (!date) return;

  await prisma.availabilityException.create({
    data: {
      date: new Date(date),
      closed: String(formData.get("closed") ?? "") === "on",
      overrideCapacity: formData.get("overrideCapacity")
        ? Number(formData.get("overrideCapacity"))
        : null,
      note: String(formData.get("note") ?? "") || null,
    },
  });
}

export async function deleteAvailabilityExceptionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.availabilityException.delete({ where: { id } });
}

