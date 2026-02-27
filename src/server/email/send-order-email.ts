import { formatInTimeZone } from "date-fns-tz";

import type { EstimateResult } from "@/server/calc/estimate";
import type { WizardPayload } from "@/lib/wizard-schema";
import { getMailer } from "@/server/email/mailer";
import { generateQuotePdf } from "@/server/pdf/generate-quote";

type EmailItemRow = {
  name: string;
  qty: number;
  isDisposal: boolean;
  lineVolumeM3: number;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function accessText(access: NonNullable<WizardPayload["accessPickup"]>) {
  const parts = [
    `Objekt: ${access.propertyType}`,
    `Etage: ${access.floor}`,
    `Aufzug: ${access.elevator}`,
    `Treppen: ${access.stairs}`,
    `Parken: ${access.parking}`,
    `Trageweg: ${access.carryDistanceM}m`,
  ];
  if (access.needNoParkingZone) parts.push("Halteverbotszone: Ja");
  return parts.join(" · ");
}

function itemRowsText(title: string, rows: EmailItemRow[]) {
  if (!rows.length) return [];
  return [title, ...rows.map((r) => `- ${r.name} × ${r.qty} (ca. ${r.lineVolumeM3.toFixed(2)} m³)`), ""];
}

function itemRowsHtml(title: string, rows: EmailItemRow[]) {
  if (!rows.length) return "";
  return `<p><b>${title}</b><br/>${rows.map((r) => `• ${r.name} × ${r.qty} (ca. ${r.lineVolumeM3.toFixed(2)} m³)`).join("<br/>")}</p>`;
}

function preferredTimeWindowLabel(value: "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE") {
  if (value === "MORNING") return "Vormittag";
  if (value === "AFTERNOON") return "Nachmittag";
  if (value === "EVENING") return "Abend";
  return "Flexibel";
}

export async function sendOrderEmail(args: {
  publicId: string;
  payload: WizardPayload;
  estimate: EstimateResult;
  requestedDateFrom: Date;
  requestedDateTo: Date;
  preferredTimeWindow: "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE";
  uploadNames: string[];
  itemRows: EmailItemRow[];
  quoteId?: string | null;
  offerNo?: string;
  offerLink?: string;
}) {
  const transporter = getMailer();
  if (!transporter) return { ok: false as const, skipped: true as const };

  const to = process.env.ORDER_RECEIVER_EMAIL || process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!to || !from) return { ok: false as const, skipped: true as const };

  const timingLabel =
    `${formatInTimeZone(args.requestedDateFrom, "Europe/Berlin", "dd.MM.yyyy")} bis ` +
    `${formatInTimeZone(args.requestedDateTo, "Europe/Berlin", "dd.MM.yyyy")} (${preferredTimeWindowLabel(args.preferredTimeWindow)})`;

  const subject = `Neue Anfrage ${args.publicId} — ${args.payload.serviceType} (${args.payload.timing.speed})`;
  const moveRows = args.itemRows.filter((r) => !r.isDisposal);
  const disposalRows = args.itemRows.filter((r) => r.isDisposal);

  const lines: string[] = [];
  lines.push(`Auftrags-ID: ${args.publicId}`);
  if (args.quoteId) lines.push(`Quote-ID: ${args.quoteId}`);
  lines.push(`Leistung: ${args.payload.serviceType}`);
  lines.push(`Priorität: ${args.payload.timing.speed}`);
  lines.push(`Wunschtermin: ${timingLabel}`);
  lines.push("Status: Termin angefragt (REQUESTED)");
  if (args.offerNo) lines.push(`Angebotsnummer: ${args.offerNo}`);
  if (args.offerLink) lines.push(`Angebotslink: ${args.offerLink}`);
  lines.push("");
  lines.push(`Kunde: ${args.payload.customer.name}`);
  lines.push(`Telefon: ${args.payload.customer.phone}`);
  lines.push(`E-Mail: ${args.payload.customer.email}`);
  lines.push(`Kontakt bevorzugt: ${args.payload.customer.contactPreference}`);
  if (args.payload.customer.note) lines.push(`Notiz: ${args.payload.customer.note}`);
  lines.push("");
  if (args.payload.startAddress) lines.push(`Start: ${args.payload.startAddress.displayName}`);
  if (args.payload.destinationAddress)
    lines.push(`Ziel: ${args.payload.destinationAddress.displayName}`);
  if (args.payload.pickupAddress) lines.push(`Abholung: ${args.payload.pickupAddress.displayName}`);
  if (args.payload.accessStart) lines.push(`Zugang Start: ${accessText(args.payload.accessStart)}`);
  if (args.payload.accessDestination)
    lines.push(`Zugang Ziel: ${accessText(args.payload.accessDestination)}`);
  if (args.payload.accessPickup) lines.push(`Zugang Abholung: ${accessText(args.payload.accessPickup)}`);
  lines.push("");

  lines.push(...itemRowsText("Gegenstände (Umzug):", moveRows));
  lines.push(...itemRowsText("Gegenstände (Entsorgung):", disposalRows));
  if (args.payload.disposal?.categories?.length) {
    lines.push(`Entsorgungskategorien: ${args.payload.disposal.categories.join(", ")}`);
  }
  if ((args.payload.disposal?.volumeExtraM3 ?? 0) > 0) {
    lines.push(`Zusatz-Volumen Entsorgung: ${args.payload.disposal?.volumeExtraM3} m³`);
  }
  if (args.payload.disposal) {
    lines.push(
      `Ausschlüsse bestätigt: ${args.payload.disposal.forbiddenConfirmed ? "Ja" : "Nein"}`,
    );
  }
  lines.push("");

  lines.push(`Volumen (gesamt): ${args.estimate.totalVolumeM3} m³`);
  lines.push(`Arbeitszeit (Schätzung): ${args.estimate.laborHours} Std.`);
  if (args.estimate.distanceKm != null) lines.push(`Distanz (Schätzung): ${args.estimate.distanceKm} km`);
  lines.push(`Preisrahmen: ${eur(args.estimate.priceMinCents)} – ${eur(args.estimate.priceMaxCents)}`);
  lines.push("");
  if (args.uploadNames.length) {
    lines.push("Hochgeladene Dateien:");
    for (const f of args.uploadNames) lines.push(`- ${f}`);
    lines.push("");
  }
  lines.push("Diese Anfrage wurde über das Online-Formular gesendet.");

  const text = lines.join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>Neue Anfrage: ${args.publicId}</h2>
      ${args.quoteId ? `<p><b>Quote-ID:</b> ${args.quoteId}</p>` : ""}
      <p><b>Leistung:</b> ${args.payload.serviceType} &nbsp; <b>Priorität:</b> ${args.payload.timing.speed}</p>
      <p><b>Wunschtermin:</b> ${timingLabel}<br/><b>Status:</b> Termin angefragt (REQUESTED)</p>
      ${args.offerNo ? `<p><b>Angebotsnummer:</b> ${args.offerNo}</p>` : ""}
      ${args.offerLink ? `<p><b>Angebotslink:</b> <a href="${args.offerLink}">${args.offerLink}</a></p>` : ""}
      <hr/>
      <p><b>Kunde:</b> ${args.payload.customer.name}<br/>
         <b>Telefon:</b> ${args.payload.customer.phone}<br/>
         <b>E-Mail:</b> ${args.payload.customer.email}<br/>
         <b>Kontakt bevorzugt:</b> ${args.payload.customer.contactPreference}</p>
      ${args.payload.customer.note ? `<p><b>Notiz:</b> ${args.payload.customer.note}</p>` : ""}
      <hr/>
      <p>
        ${args.payload.startAddress ? `<b>Start:</b> ${args.payload.startAddress.displayName}<br/>` : ""}
        ${args.payload.destinationAddress ? `<b>Ziel:</b> ${args.payload.destinationAddress.displayName}<br/>` : ""}
        ${args.payload.pickupAddress ? `<b>Abholung:</b> ${args.payload.pickupAddress.displayName}<br/>` : ""}
        ${args.payload.accessStart ? `<b>Zugang Start:</b> ${accessText(args.payload.accessStart)}<br/>` : ""}
        ${args.payload.accessDestination ? `<b>Zugang Ziel:</b> ${accessText(args.payload.accessDestination)}<br/>` : ""}
        ${args.payload.accessPickup ? `<b>Zugang Abholung:</b> ${accessText(args.payload.accessPickup)}<br/>` : ""}
      </p>
      ${itemRowsHtml("Gegenstände (Umzug)", moveRows)}
      ${itemRowsHtml("Gegenstände (Entsorgung)", disposalRows)}
      ${
        args.payload.disposal?.categories?.length
          ? `<p><b>Entsorgungskategorien:</b> ${args.payload.disposal.categories.join(", ")}</p>`
          : ""
      }
      ${
        (args.payload.disposal?.volumeExtraM3 ?? 0) > 0
          ? `<p><b>Zusatz-Volumen Entsorgung:</b> ${args.payload.disposal?.volumeExtraM3} m³</p>`
          : ""
      }
      ${
        args.payload.disposal
          ? `<p><b>Ausschlüsse bestätigt:</b> ${args.payload.disposal.forbiddenConfirmed ? "Ja" : "Nein"}</p>`
          : ""
      }
      <p><b>Volumen:</b> ${args.estimate.totalVolumeM3} m³<br/>
         <b>Arbeitszeit:</b> ${args.estimate.laborHours} Std.<br/>
         ${args.estimate.distanceKm != null ? `<b>Distanz:</b> ${args.estimate.distanceKm} km<br/>` : ""}
         <b>Preisrahmen:</b> ${eur(args.estimate.priceMinCents)} – ${eur(args.estimate.priceMaxCents)}
      </p>
      ${
        args.uploadNames.length
          ? `<p><b>Hochgeladene Dateien:</b><br/>${args.uploadNames.map((n) => `• ${n}`).join("<br/>")}</p>`
          : ""
      }
      <p style="color:#64748b;font-size:12px;">Diese Anfrage wurde über das Online-Formular gesendet.</p>
    </div>
  `;

  const netCents = args.estimate.priceMaxCents;
  const vatCents = Math.round(netCents * 0.19);
  const grossCents = netCents + vatCents;
  const quotePdf = await generateQuotePdf({
    publicId: args.publicId,
    customerName: args.payload.customer.name,
    customerEmail: args.payload.customer.email,
    serviceType: args.payload.serviceType,
    speed: args.payload.timing.speed,
    slotLabel: `Anfragezeitraum: ${timingLabel}`,
    lines: args.itemRows.map((r) => ({
      label: r.name,
      qty: r.qty,
      unit: Math.round((r.lineVolumeM3 / Math.max(r.qty, 1)) * 100),
      total: Math.round((args.estimate.priceMaxCents / Math.max(args.itemRows.length, 1)) * 1),
    })),
    netCents,
    vatCents,
    grossCents,
  });

  try {
    await transporter.sendMail({
      to,
      from,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `${args.publicId}-angebot.pdf`,
          content: quotePdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    console.error("[sendOrderEmail] Failed:", err);
    return { ok: false as const, skipped: false as const };
  }

  return { ok: true as const };
}


