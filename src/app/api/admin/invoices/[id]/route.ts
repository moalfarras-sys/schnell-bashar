import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

async function verifyAdmin(requiredPermission: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return false;
  try {
    const claims = await verifyAdminToken(token);
    return hasPermission(claims.roles, claims.permissions, requiredPermission);
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin("accounting.read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: { orderBy: { paidAt: "desc" } }, items: { orderBy: { sortOrder: "asc" } }, contract: true, offer: true, order: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin("accounting.update"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.customerName) updateData.customerName = body.customerName;
  if (body.customerEmail) updateData.customerEmail = body.customerEmail;
  if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.dueAt) updateData.dueAt = new Date(body.dueAt);
  if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl;

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ invoice });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin("accounting.update"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
