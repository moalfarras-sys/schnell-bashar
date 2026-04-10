import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Wallet,
  XCircle,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { PaymentForm, MarkAsPaidButton, CancelInvoiceButton } from "./invoice-actions";
import {
  manualInvoiceReferenceRows,
  manualInvoiceServiceRows,
  manualItemDetailLines,
  normalizeManualInvoiceMeta,
} from "@/lib/manual-invoice";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const methodLabels: Record<string, { label: string; icon: any }> = {
  BANK_TRANSFER: { label: "Überweisung", icon: Building },
  CASH: { label: "Bargeld", icon: Banknote },
  CARD: { label: "Karte", icon: CreditCard },
  PAYPAL: { label: "PayPal", icon: Wallet },
  OTHER: { label: "Sonstige", icon: Wallet },
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;
  let dbWarning: string | null = null;
  let invoice: any = null;

  try {
    invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        items: { orderBy: { sortOrder: "asc" } },
        contract: true,
        offer: true,
        order: true,
      },
    });
  } catch (error) {
    dbWarning =
      error instanceof Error
        ? `Datenbankfehler: ${error.message}`
        : "Datenbankfehler: Rechnung konnte nicht geladen werden.";
  }

  if (dbWarning) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Container className="py-8">
          <Link
            href="/admin/accounting/invoices"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Rechnungen
          </Link>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {dbWarning}
          </div>
        </Container>
      </div>
    );
  }

  if (!invoice) notFound();

  const manualMeta = normalizeManualInvoiceMeta(invoice.lineItems);
  const manualReferenceRows = manualInvoiceReferenceRows(manualMeta?.references);
  const manualServiceRows = manualInvoiceServiceRows(manualMeta?.serviceDetails);

  const outstanding = Math.max(0, invoice.grossCents - invoice.paidCents);
  const now = new Date();
  const isOverdue =
    (invoice.status === "UNPAID" || invoice.status === "PARTIAL") && invoice.dueAt < now;

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-6">
          <Link
            href="/admin/accounting/invoices"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Rechnungen
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Rechnung {invoice.invoiceNo || invoice.id.slice(0, 8)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isOverdue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                  <AlertTriangle className="h-3 w-3" />
                  Überfällig
                </span>
              ) : invoice.status === "PAID" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  <CheckCircle2 className="h-3 w-3" />
                  Bezahlt
                </span>
              ) : invoice.status === "PARTIAL" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                  <Clock className="h-3 w-3" />
                  Teilbezahlt
                </span>
              ) : invoice.status === "CANCELLED" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                  <XCircle className="h-3 w-3" />
                  Storniert
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
                  <Clock className="h-3 w-3" />
                  Offen
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={`/api/admin/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                PDF herunterladen
              </Button>
            </a>
            {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
              <MarkAsPaidButton invoiceId={invoice.id} outstandingCents={outstanding} />
            )}
            {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
              <CancelInvoiceButton invoiceId={invoice.id} />
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                Kundeninformationen
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Name</div>
                  <div className="text-sm font-semibold text-slate-900">{invoice.customerName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">E-Mail</div>
                  <div className="text-sm font-semibold text-slate-900">{invoice.customerEmail}</div>
                </div>
                {invoice.customerPhone && (
                  <div>
                    <div className="text-xs text-slate-500">Telefon</div>
                    <div className="text-sm font-semibold text-slate-900">{invoice.customerPhone}</div>
                  </div>
                )}
                {invoice.address && (
                  <div>
                    <div className="text-xs text-slate-500">Adresse</div>
                    <div className="text-sm font-semibold text-slate-900">{invoice.address}</div>
                  </div>
                )}
              </div>
            </div>

            {invoice.description && (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Leistungsbeschreibung
                </h2>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{invoice.description}</p>
              </div>
            )}

            {manualServiceRows.length > 0 && (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Leistungsdetails
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {manualServiceRows.map((row) => (
                    <div key={`${row.label}-${row.value}`}>
                      <div className="text-xs text-slate-500">{row.label}</div>
                      <div className="whitespace-pre-wrap text-sm font-semibold text-slate-900">
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invoice.items.length > 0 && (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Positionen
                </h2>
                <div className="space-y-3">
                  {invoice.items.map((item: any, index: number) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_90px_100px_120px]"
                    >
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Position {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{item.description}</div>
                        {manualItemDetailLines(manualMeta?.itemDetails?.[index]).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {manualItemDetailLines(manualMeta?.itemDetails?.[index]).map((line) => (
                              <div key={line} className="text-xs text-slate-600">
                                {line}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-700">
                        <div className="text-xs text-slate-500">Menge</div>
                        <div className="font-semibold">{item.quantity}</div>
                      </div>
                      <div className="text-sm text-slate-700">
                        <div className="text-xs text-slate-500">Einheit</div>
                        <div className="font-semibold">{item.unit}</div>
                      </div>
                      <div className="text-sm text-slate-700 md:text-right">
                        <div className="text-xs text-slate-500">Gesamt</div>
                        <div className="font-semibold">{formatEuro(item.lineTotalCents)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Notizen / Zahlungsbedingungen
                </h2>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{invoice.notes}</p>
              </div>
            )}

            <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                Betrag
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Nettobetrag</span>
                  <span className="font-medium text-slate-900">{formatEuro(invoice.netCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">MwSt.</span>
                  <span className="font-medium text-slate-900">{formatEuro(invoice.vatCents)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-slate-900">Gesamt (brutto)</span>
                  <span className="text-slate-900">{formatEuro(invoice.grossCents)}</span>
                </div>
                {invoice.paidCents > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Bereits bezahlt</span>
                      <span className="font-medium text-green-600">{formatEuro(invoice.paidCents)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                      <span className={outstanding > 0 ? "text-red-600" : "text-green-600"}>
                        Offener Betrag
                      </span>
                      <span className={outstanding > 0 ? "text-red-600" : "text-green-600"}>
                        {formatEuro(outstanding)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {invoice.payments.length > 0 && (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Zahlungsverlauf
                </h2>
                <div className="space-y-3">
                  {invoice.payments.map((payment: any) => {
                    const methodInfo = methodLabels[payment.method] || methodLabels.OTHER;
                    const MethodIcon = methodInfo.icon;
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <MethodIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {formatEuro(payment.amountCents)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {methodInfo.label}
                            {payment.reference && ` · ${payment.reference}`}
                          </div>
                          {payment.notes && (
                            <div className="mt-1 text-xs text-slate-400">{payment.notes}</div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {format(payment.paidAt, "dd.MM.yyyy HH:mm", { locale: de })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                Details
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Rechnungsnr.</span>
                  <div className="font-semibold text-slate-900">{invoice.invoiceNo || "-"}</div>
                </div>
                <div>
                  <span className="text-slate-500">Erstellt am</span>
                  <div className="font-semibold text-slate-900">
                    {format(invoice.issuedAt, "dd.MM.yyyy HH:mm", { locale: de })}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Fällig am</span>
                  <div className={`font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
                    {format(invoice.dueAt, "dd.MM.yyyy", { locale: de })}
                  </div>
                </div>
                {manualReferenceRows.map((row) => (
                  <div key={`${row.label}-${row.value}`}>
                    <span className="text-slate-500">{row.label}</span>
                    <div className="break-words font-semibold text-slate-900">{row.value}</div>
                  </div>
                ))}
                {invoice.order && (
                  <div>
                    <span className="text-slate-500">Auftrag</span>
                    <div className="font-semibold text-slate-900">
                      {invoice.order.orderNo || invoice.order.publicId}
                    </div>
                  </div>
                )}
                {invoice.offer && (
                  <div>
                    <span className="text-slate-500">Angebot</span>
                    <div className="font-semibold text-slate-900">{invoice.offer.offerNo || invoice.offer.id}</div>
                  </div>
                )}
                {invoice.contract && (
                  <div>
                    <span className="text-slate-500">Vertrag</span>
                    <div className="font-semibold text-slate-900">{invoice.contract.contractNo || invoice.contract.id}</div>
                  </div>
                )}
              </div>
            </div>

            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-green-800">
                  Zahlung erfassen
                </h2>
                <PaymentForm invoiceId={invoice.id} outstandingCents={outstanding} />
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
