import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/auth/require-admin";
import { sendScheduleConfirmationEmail } from "@/server/email/send-schedule-confirmation";

const bodySchema = z.object({
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  note: z.string().max(300).optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }

  const slotStart = new Date(parsed.data.slotStart);
  const slotEnd = new Date(parsed.data.slotEnd);
  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    return NextResponse.json({ error: "Ungültiges Zeitfenster." }, { status: 400 });
  }

  const { publicId } = await context.params;
  const order = await prisma.order.findUnique({
    where: { publicId },
    select: {
      publicId: true,
      customerName: true,
      customerEmail: true,
      note: true,
      status: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const updated = await prisma.order.update({
    where: { publicId },
    data: {
      slotStart,
      slotEnd,
      scheduledAt: new Date(),
      status: "CONFIRMED",
      note: parsed.data.note ? `${order.note ? `${order.note}\n` : ""}${parsed.data.note}` : order.note,
    },
    select: { publicId: true, status: true, slotStart: true, slotEnd: true },
  });

  const emailResult = await sendScheduleConfirmationEmail({
    publicId: order.publicId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    slotStart,
    slotEnd,
    note: parsed.data.note,
  }).catch((e) => {
    console.error("[admin/orders/schedule] schedule email failed:", e);
    return { ok: false as const, skipped: false as const };
  });

  if (!emailResult.ok) {
    console.warn("[admin/orders/schedule] schedule saved without email", {
      publicId: order.publicId,
      customerEmail: order.customerEmail,
      skipped: "skipped" in emailResult ? emailResult.skipped : false,
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${publicId}`);
  revalidatePath(`/anfrage/${publicId}`);

  return NextResponse.json({
    ok: true,
    publicId: updated.publicId,
    status: updated.status,
    email: emailResult.ok
      ? { ok: true, message: "E-Mail wurde an den Kunden gesendet." }
      : {
          ok: false,
          message:
            "Termin wurde gespeichert, aber die E-Mail konnte nicht gesendet werden. Bitte SMTP prüfen.",
        },
  });
}
