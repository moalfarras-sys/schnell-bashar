import { formatDate, formatNumber } from "@/lib/number-format";
import type { Job, MoveAddress } from "@/types/document";

function AddressBox({
  label,
  address,
  compact = false
}: {
  label: string;
  address: MoveAddress;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-sm border border-slate-500 ${compact ? "p-2.5" : "p-3"}`}>
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-800">
        {label}
      </p>
      <p className="font-bold text-slate-950">{address.street}</p>
      <p>
        {address.postalCode} {address.city}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] font-medium text-slate-900">
        <dt>Etage</dt>
        <dd className="text-right">{address.floor || "-"}</dd>
        <dt>Ladeweg</dt>
        <dd className="text-right">{address.carryDistance || "-"}</dd>
        <dt>Fahrstuhl</dt>
        <dd className="text-right">{address.hasElevator ? "Ja" : "Nein"}</dd>
      </dl>
    </div>
  );
}

export function MoveDetails({
  job,
  compact = false
}: {
  job: Job;
  compact?: boolean;
}) {
  return (
    <section className={`print-section ${compact ? "mt-3" : "mt-5"}`}>
      <div className="grid grid-cols-2 gap-3">
        <AddressBox label="Auszugsadresse" address={job.moveOutAddress} compact={compact} />
        <AddressBox label="Einzugsadresse" address={job.moveInAddress} compact={compact} />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2 rounded-sm border border-slate-500 bg-slate-100 p-2.5 text-[11.5px] font-semibold text-slate-950">
        <div>
          <p className="text-slate-500">Umzugsdatum</p>
          <p className="font-semibold">{formatDate(job.moveDate)}</p>
        </div>
        <div>
          <p className="text-slate-500">Uhrzeit</p>
          <p className="font-semibold">{job.moveTime} Uhr</p>
        </div>
        <div>
          <p className="text-slate-500">Distanz</p>
          <p className="font-semibold">{formatNumber(job.distanceKm)} km</p>
        </div>
        <div>
          <p className="text-slate-500">Volumen</p>
          <p className="font-semibold">{formatNumber(job.volumeCbm)} m³</p>
        </div>
        <div>
          <p className="text-slate-500">Halteverbot</p>
          <p className="font-semibold">{job.parkingPermit ? "Ja" : "Nein"}</p>
        </div>
      </div>
    </section>
  );
}
