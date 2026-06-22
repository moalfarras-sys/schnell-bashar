export function SignatureFields({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`print-section ${compact ? "mt-4" : "mt-6"} grid grid-cols-2 gap-8 text-[11.5px] font-semibold text-slate-900`}
    >
      <div>
        <div className={`${compact ? "h-10" : "h-14"} border-b-2 border-slate-800`} />
        <p className="mt-2 text-slate-600">Ort, Datum, Unterschrift Kunde</p>
      </div>
      <div>
        <div className={`${compact ? "h-10" : "h-14"} border-b-2 border-slate-800`} />
        <p className="mt-2 text-slate-600">
          Ort, Datum, Unterschrift Pünktlich Umzüge
        </p>
      </div>
    </section>
  );
}
