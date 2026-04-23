type Props = {
  title: string;
  documentNumber: string;
  companyName?: string;
  metaRows?: Array<{ label: string; value: string | null }>;
  children: React.ReactNode;
};

export function BaseDocumentLayout({
  title,
  documentNumber,
  companyName = "Schnell Sicher Umzug",
  metaRows,
  children,
}: Props) {
  const filteredMetaRows = (metaRows ?? []).filter((row) => row.value);
  return (
    <html lang="de">
      <body>
        <style>{`
          @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; font-size: 12px; line-height: 1.5; }
          .page { width: 100%; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #d1d5db; padding-bottom: 12px; margin-bottom: 18px; }
          .title { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
          .subtle { color: #4b5563; }
          .meta { text-align: right; }
          .meta-row { display: flex; gap: 12px; justify-content: flex-end; margin-top: 4px; }
          .meta-row strong { min-width: 92px; color: #4b5563; text-align: left; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
          .section-title { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          thead { background: #f3f4f6; }
          th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .totals { margin-top: 14px; width: 100%; max-width: 300px; margin-left: auto; break-inside: avoid; page-break-inside: avoid; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals-row.total { font-weight: 700; border-top: 1px solid #d1d5db; margin-top: 4px; padding-top: 8px; }
          .signature { min-height: 120px; break-inside: avoid; page-break-inside: avoid; }
          .signature-line { margin-top: 52px; border-top: 1px solid #111827; padding-top: 6px; }
          .muted { color: #6b7280; }
        `}</style>
        <div className="page">
          <header className="header">
            <div>
              <h1 className="title">{title}</h1>
              <div>{companyName}</div>
              <div className="subtle">Anzengruber Straße 9 · 12043 Berlin</div>
              <div className="subtle">+49 172 9573681 · kontakt@schnellsicherumzug.de</div>
              <div className="subtle">Telefonisch 24/7 erreichbar. Termine nach Vereinbarung.</div>
            </div>
            <div className="meta">
              {filteredMetaRows.length > 0 ? (
                filteredMetaRows.map((row) => (
                  <div key={row.label} className="meta-row">
                    <strong>{row.label}</strong>
                    <span>{row.value}</span>
                  </div>
                ))
              ) : (
                <div className="meta-row">
                  <strong>Nr.</strong>
                  <span>{documentNumber}</span>
                </div>
              )}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
