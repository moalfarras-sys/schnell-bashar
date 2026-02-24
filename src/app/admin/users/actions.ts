"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/server/audit/log";
import { requireAdminPermission } from "@/server/auth/require-admin";

async function ensureUsersUpdatePermission() {
  const session = await requireAdminPermission("users.update");
  if (!session.ok) {
    throw new Error("Nicht berechtigt");
  }
}

export async function createAdminUserAction(formData: FormData) {
  await ensureUsersUpdatePermission();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "").trim();

  if (!name || !email || !password || !roleId) return;

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      roles: {
        create: [{ roleId }],
      },
    },
  });

  await writeAuditLog({
    action: "admin_user.create",
    entityType: "AdminUser",
    entityId: user.id,
    after: { email: user.email, name: user.name },
    path: "/admin/users",
  });

  revalidatePath("/admin/users");
}

export async function toggleAdminUserAction(formData: FormData) {
  await ensureUsersUpdatePermission();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return;

  const prev = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!prev) return;

  const updated = await prisma.adminUser.update({
    where: { id: userId },
    data: { isActive: !prev.isActive },
  });

  await writeAuditLog({
    action: "admin_user.toggle_active",
    entityType: "AdminUser",
    entityId: updated.id,
    before: { isActive: prev.isActive },
    after: { isActive: updated.isActive },
    path: "/admin/users",
  });

  revalidatePath("/admin/users");
}

export async function resetAdminPasswordAction(formData: FormData) {
  await ensureUsersUpdatePermission();

  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!userId || !password) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await writeAuditLog({
    action: "admin_user.password_reset",
    entityType: "AdminUser",
    entityId: userId,
    path: "/admin/users",
  });

  revalidatePath("/admin/users");
}

export async function setAdminRoleAction(formData: FormData) {
  await ensureUsersUpdatePermission();

  const userId = String(formData.get("userId") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "").trim();
  if (!userId || !roleId) return;

  await prisma.userRole.updateMany({
    where: { userId },
    data: { deletedAt: new Date() },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: { deletedAt: null },
    create: { userId, roleId },
  });

  await writeAuditLog({
    action: "admin_user.set_role",
    entityType: "AdminUser",
    entityId: userId,
    after: { roleId },
    path: "/admin/users",
  });

  revalidatePath("/admin/users");
}

