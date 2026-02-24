import bcrypt from "bcryptjs";

import { prisma } from "@/server/db/prisma";
import {
  ADMIN_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSION_MAP,
} from "@/server/auth/admin-permissions";

async function ensurePermissionRows() {
  for (const key of ADMIN_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: { label: key },
      create: { key, label: key },
    });
  }
}

export async function ensureDefaultRbac() {
  await ensurePermissionRows();

  for (const [slug, keys] of Object.entries(DEFAULT_ROLE_PERMISSION_MAP)) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: { name: slug.charAt(0).toUpperCase() + slug.slice(1) },
      create: {
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
      },
    });

    const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });

    for (const permission of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

export async function ensureBootstrapAdminFromEnv() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const plain = String(process.env.ADMIN_PASSWORD ?? "").trim();
  const hash = String(process.env.ADMIN_PASSWORD_HASH ?? "").trim();

  if (!email) return null;

  await ensureDefaultRbac();

  const ownerRole = await prisma.role.findUnique({ where: { slug: "owner" } });
  if (!ownerRole) return null;

  const existing = await prisma.adminUser.findUnique({
    where: { email },
    include: {
      roles: {
        where: { deletedAt: null },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  let passwordHash = existing?.passwordHash ?? "";
  if (!passwordHash) {
    if (hash && /^\$2[aby]\$/.test(hash)) {
      passwordHash = hash;
    } else if (plain) {
      passwordHash = await bcrypt.hash(plain, 12);
    }
  }

  if (!passwordHash) return existing;

  const user =
    existing ??
    (await prisma.adminUser.create({
      data: {
        email,
        name: "Owner",
        passwordHash,
      },
    }));

  if (!existing) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: ownerRole.id } },
      update: { deletedAt: null },
      create: { userId: user.id, roleId: ownerRole.id },
    });
  }

  if (existing && existing.passwordHash !== passwordHash) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
  }

  return await prisma.adminUser.findUnique({
    where: { email },
    include: {
      roles: {
        where: { deletedAt: null },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAdminClaimsByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const user = await prisma.adminUser.findUnique({
    where: { email: normalized },
    include: {
      roles: {
        where: { deletedAt: null },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const roles = user.roles.map((r) => r.role.slug);
  const permissions = new Set<string>();
  for (const role of user.roles) {
    for (const rp of role.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  return {
    user,
    roles,
    permissions: [...permissions],
  };
}

export async function markLoginFailure(userId: string) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) return;
  const failedCount = user.failedLoginCount + 1;
  const lockMinutes = failedCount >= 5 ? 15 : 0;
  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      failedLoginCount: failedCount,
      lockedUntil: lockMinutes > 0 ? new Date(Date.now() + lockMinutes * 60_000) : null,
    },
  });
}

export async function markLoginSuccess(userId: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

