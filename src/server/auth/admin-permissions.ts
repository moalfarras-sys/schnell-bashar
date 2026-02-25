export const ADMIN_PERMISSION_KEYS = [
  "dashboard.view",
  "orders.read",
  "orders.update",
  "orders.cancel",
  "offers.read",
  "offers.create",
  "offers.update",
  "offers.delete",
  "pricing.read",
  "pricing.update",
  "availability.read",
  "availability.update",
  "catalog.read",
  "catalog.update",
  "services.read",
  "services.update",
  "promos.read",
  "promos.update",
  "media.read",
  "media.update",
  "content.read",
  "content.update",
  "jobs.read",
  "jobs.update",
  "accounting.read",
  "accounting.update",
  "accounting.export",
  "users.read",
  "users.update",
  "roles.read",
  "roles.update",
  "audit.read",
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number];

const PREFIX_RULES: Array<{ prefix: string; permission: AdminPermissionKey }> = [
  { prefix: "/admin/accounting", permission: "accounting.read" },
  { prefix: "/admin/orders", permission: "orders.read" },
  { prefix: "/admin/offers", permission: "offers.read" },
  { prefix: "/admin/pricing", permission: "pricing.read" },
  { prefix: "/admin/availability", permission: "availability.read" },
  { prefix: "/admin/calendar", permission: "availability.read" },
  { prefix: "/admin/catalog", permission: "catalog.read" },
  { prefix: "/admin/services", permission: "services.read" },
  { prefix: "/admin/media", permission: "media.read" },
  { prefix: "/admin/content", permission: "content.read" },
  { prefix: "/admin/jobs", permission: "jobs.read" },
  { prefix: "/admin/users", permission: "users.read" },
  { prefix: "/admin/roles", permission: "roles.read" },
  { prefix: "/admin/audit", permission: "audit.read" },
];

export function requiredPermissionForPath(pathname: string): AdminPermissionKey | null {
  if (pathname === "/admin") return "dashboard.view";
  for (const rule of PREFIX_RULES) {
    if (pathname.startsWith(rule.prefix)) return rule.permission;
  }
  return null;
}

export function hasPermission(
  roles: string[],
  permissions: string[],
  required: string | null,
): boolean {
  if (!required) return true;
  if (roles.includes("owner")) return true;
  return permissions.includes(required);
}

export const DEFAULT_ROLE_PERMISSION_MAP: Record<string, AdminPermissionKey[]> = {
  owner: [...ADMIN_PERMISSION_KEYS],
  admin: [
    "dashboard.view",
    "orders.read",
    "orders.update",
    "offers.read",
    "offers.create",
    "offers.update",
    "pricing.read",
    "pricing.update",
    "availability.read",
    "availability.update",
    "catalog.read",
    "catalog.update",
    "services.read",
    "services.update",
    "promos.read",
    "promos.update",
    "media.read",
    "media.update",
    "content.read",
    "content.update",
    "jobs.read",
    "jobs.update",
    "accounting.read",
    "accounting.update",
    "accounting.export",
  ],
  accountant: [
    "dashboard.view",
    "accounting.read",
    "accounting.update",
    "accounting.export",
    "orders.read",
    "offers.read",
  ],
  ops: [
    "dashboard.view",
    "orders.read",
    "orders.update",
    "offers.read",
    "offers.update",
    "availability.read",
    "availability.update",
    "jobs.read",
    "jobs.update",
    "media.read",
    "media.update",
    "services.read",
  ],
};

