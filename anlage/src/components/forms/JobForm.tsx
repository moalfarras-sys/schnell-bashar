"use client";

import { calculateTotals } from "@/lib/calculations";
import {
  centsFromEuroInput,
  euroInputFromCents,
  formatCurrency
} from "@/lib/number-format";
import type { Customer, Job, LineItem, MoveAddress } from "@/types/document";
import { Button } from "@/components/ui/Button";

type JobFormProps = {
  job: Job;
  customers: Customer[];
  step: number;
  onStepChange: (step: number) => void;
  onChange: (job: Job) => void;
  onSave: () => void;
  saveStatus: string;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-[15px] font-medium text-slate-950 outline-none transition focus:border-[#f26b21] focus:ring-2 focus:ring-[#f26b21]/25";
const textareaClass =
  "min-h-24 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-[15px] font-medium text-slate-950 outline-none transition focus:border-[#f26b21] focus:ring-2 focus:ring-[#f26b21]/25";
const labelClass = "text-xs font-black uppercase tracking-wide text-slate-700";
const steps = ["Kunde", "Adressen", "Umzugsdaten", "Leistungen / Preise", "Vorschau & PDF"];

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClass}>
        {label} {required ? <span className="text-[#f26b21]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      {note ? <p className="mt-1 text-sm font-medium text-slate-700">{note}</p> : null}
    </div>
  );
}

export function JobForm({
  job,
  customers,
  step,
  onStepChange,
  onChange,
  onSave,
  saveStatus
}: JobFormProps) {
  const totals = calculateTotals(job.items);

  function updateJob<K extends keyof Job>(key: K, value: Job[K]) {
    onChange({ ...job, [key]: value });
  }

  function updateCustomer(key: keyof Job["customer"], value: string) {
    onChange({ ...job, customer: { ...job.customer, [key]: value } });
  }

  function selectCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    if (customer) {
      onChange({ ...job, customer });
    }
  }

  function updateAddress(
    section: "moveOutAddress" | "moveInAddress",
    key: keyof MoveAddress,
    value: string | boolean
  ) {
    onChange({ ...job, [section]: { ...job[section], [key]: value } });
  }

  function updateItem(itemId: string, patch: Partial<LineItem>) {
    onChange({
      ...job,
      items: job.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      )
    });
  }

  function addItem() {
    onChange({
      ...job,
      items: [
        ...job.items,
        {
          id: `item-${Date.now()}`,
          description: "Neue Leistung",
          unit: "Pauschal",
          quantity: 1,
          unitPriceCents: 0
        }
      ]
    });
  }

  function removeItem(itemId: string) {
    onChange({ ...job, items: job.items.filter((item) => item.id !== itemId) });
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="grid grid-cols-1 gap-2 rounded-md bg-slate-100 p-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            onClick={() => onStepChange(index + 1)}
            className={`rounded-md px-3 py-3 text-left text-xs font-black uppercase tracking-wide transition ${
              step === index + 1
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="block text-[10px] opacity-75">Schritt {index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-md border border-slate-300 bg-white p-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{job.offerNumber}</p>
          <p className="text-xs font-semibold text-slate-600">{saveStatus}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          <span className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
            Status: Entwurf
          </span>
          <Button type="submit" variant="primary">
            Speichern
          </Button>
        </div>
      </div>

      {step === 1 ? (
        <section className="grid gap-5">
          <SectionTitle
            title="Kundendaten"
            note="Pflichtfelder sind markiert. Vorhandene Kunden können direkt übernommen werden."
          />
          <Field label="Vorhandenen Kunden auswählen">
            <select
              className={inputClass}
              value=""
              onChange={(event) => selectCustomer(event.target.value)}
            >
              {customers.length === 0 ? (
                <option value="">Kein Kunde vorhanden</option>
              ) : (
                <>
                  <option value="">Kunde auswählen...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.postalCode} {customer.city}
                    </option>
                  ))}
                </>
              )}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Kundenname" required>
              <input className={inputClass} required value={job.customer.name} onChange={(event) => updateCustomer("name", event.target.value)} />
            </Field>
            <Field label="E-Mail">
              <input className={inputClass} type="email" value={job.customer.email} onChange={(event) => updateCustomer("email", event.target.value)} />
            </Field>
            <Field label="Straße" required>
              <input className={inputClass} required value={job.customer.street} onChange={(event) => updateCustomer("street", event.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
              <Field label="PLZ" required>
                <input className={inputClass} required value={job.customer.postalCode} onChange={(event) => updateCustomer("postalCode", event.target.value)} />
              </Field>
              <Field label="Ort" required>
                <input className={inputClass} required value={job.customer.city} onChange={(event) => updateCustomer("city", event.target.value)} />
              </Field>
            </div>
            <Field label="Telefon">
              <input className={inputClass} value={job.customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} />
            </Field>
            <Field label="Mobil">
              <input className={inputClass} value={job.customer.mobile} onChange={(event) => updateCustomer("mobile", event.target.value)} />
            </Field>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-5">
          <SectionTitle title="Adressen" note="Auszug und Einzug mit Etage, Ladeweg und Fahrstuhl." />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {(["moveOutAddress", "moveInAddress"] as const).map((section) => (
              <div key={section} className="grid gap-4 rounded-md border-2 border-slate-300 bg-white p-5">
                <h3 className="text-lg font-black text-slate-950">
                  {section === "moveOutAddress" ? "Auszugsadresse" : "Einzugsadresse"}
                </h3>
                <Field label="Straße" required>
                  <input className={inputClass} required value={job[section].street} onChange={(event) => updateAddress(section, "street", event.target.value)} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                  <Field label="PLZ" required>
                    <input className={inputClass} required value={job[section].postalCode} onChange={(event) => updateAddress(section, "postalCode", event.target.value)} />
                  </Field>
                  <Field label="Ort" required>
                    <input className={inputClass} required value={job[section].city} onChange={(event) => updateAddress(section, "city", event.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Etage">
                    <input className={inputClass} value={job[section].floor} onChange={(event) => updateAddress(section, "floor", event.target.value)} />
                  </Field>
                  <Field label="Ladeweg">
                    <input className={inputClass} value={job[section].carryDistance} onChange={(event) => updateAddress(section, "carryDistance", event.target.value)} />
                  </Field>
                </div>
                <label className="flex items-center gap-3 text-base font-bold text-slate-900">
                  <input type="checkbox" checked={job[section].hasElevator} onChange={(event) => updateAddress(section, "hasElevator", event.target.checked)} />
                  Fahrstuhl vorhanden
                </label>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-5">
          <SectionTitle title="Umzugsdaten" note="Termin, Nummern und Status für den Vorgang." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Umzugsdatum" required>
              <input className={inputClass} required type="date" value={job.moveDate} onChange={(event) => updateJob("moveDate", event.target.value)} />
            </Field>
            <Field label="Uhrzeit" required>
              <input className={inputClass} required type="time" value={job.moveTime} onChange={(event) => updateJob("moveTime", event.target.value)} />
            </Field>
            <Field label="Distanz km">
              <input className={inputClass} type="number" value={job.distanceKm} onChange={(event) => updateJob("distanceKm", Number(event.target.value))} />
            </Field>
            <Field label="Volumen m³">
              <input className={inputClass} type="number" value={job.volumeCbm} onChange={(event) => updateJob("volumeCbm", Number(event.target.value))} />
            </Field>
            <Field label="Angebotsnummer">
              <input className={inputClass} value={job.offerNumber} onChange={(event) => updateJob("offerNumber", event.target.value)} />
            </Field>
            <Field label="Vertragsnummer">
              <input className={inputClass} value={job.contractNumber} onChange={(event) => updateJob("contractNumber", event.target.value)} />
            </Field>
            <Field label="Rechnungsnummer">
              <input className={inputClass} value={job.invoiceNumber} onChange={(event) => updateJob("invoiceNumber", event.target.value)} />
            </Field>
            <Field label="Zahlungsart">
              <input className={inputClass} value={job.paymentMethod} onChange={(event) => updateJob("paymentMethod", event.target.value)} />
            </Field>
            <Field label="Gültig bis">
              <input className={inputClass} type="date" value={job.validUntil} onChange={(event) => updateJob("validUntil", event.target.value)} />
            </Field>
            <Field label="Rechnungsdatum">
              <input className={inputClass} type="date" value={job.invoiceDate} onChange={(event) => updateJob("invoiceDate", event.target.value)} />
            </Field>
            <Field label="Leistungsdatum">
              <input className={inputClass} type="date" value={job.serviceDate} onChange={(event) => updateJob("serviceDate", event.target.value)} />
            </Field>
            <Field label="Zahlungsdatum">
              <input className={inputClass} type="date" value={job.paymentDueDate} onChange={(event) => updateJob("paymentDueDate", event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:flex sm:gap-6">
            <label className="flex items-center gap-3 text-base font-bold text-slate-900">
              <input type="checkbox" checked={job.parkingPermit} onChange={(event) => updateJob("parkingPermit", event.target.checked)} />
              Halteverbot vereinbart
            </label>
            <label className="flex items-center gap-3 text-base font-bold text-slate-900">
              <input type="checkbox" checked={job.bankChangeNotice} onChange={(event) => updateJob("bankChangeNotice", event.target.checked)} />
              Roter Bankhinweis auf Rechnung
            </label>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="grid gap-5">
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <SectionTitle title="Leistungen / Preise" note="Netto, MwSt und Brutto werden automatisch berechnet." />
            <Button type="button" onClick={addItem}>Position hinzufügen</Button>
          </div>
          <div className="overflow-x-auto rounded-md border-2 border-slate-300">
            <table className="w-full min-w-[940px] text-sm">
              <thead className="bg-slate-950 text-left text-xs font-black uppercase tracking-wide text-white">
                <tr>
                  <th className="p-3">Beschreibung</th>
                  <th className="p-3">Einheit</th>
                  <th className="p-3">Menge</th>
                  <th className="p-3">Einzelpreis Netto</th>
                  <th className="p-3 text-right">Gesamt Netto</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {job.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-300">
                    <td className="p-2">
                      <input className={inputClass} value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} />
                    </td>
                    <td className="w-36 p-2">
                      <input className={inputClass} value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} />
                    </td>
                    <td className="w-28 p-2">
                      <input className={inputClass} type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} />
                    </td>
                    <td className="w-44 p-2">
                      <input className={inputClass} value={euroInputFromCents(item.unitPriceCents)} onChange={(event) => updateItem(item.id, { unitPriceCents: centsFromEuroInput(event.target.value) })} />
                    </td>
                    <td className="w-40 p-2 text-right text-sm font-black text-slate-950">
                      {formatCurrency(Math.round(item.quantity * item.unitPriceCents))}
                    </td>
                    <td className="w-24 p-2 text-right">
                      <Button type="button" variant="danger" onClick={() => removeItem(item.id)} disabled={job.items.length === 1}>
                        Löschen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 rounded-md border border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-900 sm:ml-auto sm:w-80">
            <div className="flex justify-between gap-4">
              <span>Netto</span>
              <span>{formatCurrency(totals.netCents)}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-700">
              <span>19% MwSt</span>
              <span>{formatCurrency(totals.vatCents)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-300 pt-2 text-base font-black">
              <span>Brutto</span>
              <span>{formatCurrency(totals.grossCents)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Field label="Zahlungshinweis">
              <textarea className={textareaClass} value={job.paymentAgreement} onChange={(event) => updateJob("paymentAgreement", event.target.value)} />
            </Field>
            <Field label="Anmerkungen">
              <textarea className={textareaClass} value={job.notes} onChange={(event) => updateJob("notes", event.target.value)} />
            </Field>
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="grid gap-5 rounded-md border-2 border-slate-300 bg-slate-50 p-5">
          <SectionTitle title="Vorschau & PDF" note="Bitte rechts die Vorschau prüfen und dann das gewünschte PDF erstellen." />
          <div className="grid grid-cols-1 gap-3 text-sm font-bold text-slate-900 sm:grid-cols-3">
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-600">Angebot</p>
              <input
                className={`${inputClass} mt-2`}
                value={job.offerNumber}
                onChange={(event) => updateJob("offerNumber", event.target.value)}
              />
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-600">Vertrag</p>
              <input
                className={`${inputClass} mt-2`}
                value={job.contractNumber}
                onChange={(event) => updateJob("contractNumber", event.target.value)}
              />
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-600">Rechnung</p>
              <input
                className={`${inputClass} mt-2`}
                value={job.invoiceNumber}
                onChange={(event) => updateJob("invoiceNumber", event.target.value)}
              />
            </div>
          </div>
        </section>
      ) : null}
    </form>
  );
}

