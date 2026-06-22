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
          @page { size: A4; margin: 16mm 15mm 16mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; font-size: 11.5px; line-height: 1.45; }
          .page { width: 100%; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; align-items: flex-start; }
          .logo { max-width: 170px; max-height: 80px; margin-bottom: 8px; }
          .title { font-size: 25px; font-weight: 700; margin: 0 0 4px; letter-spacing: 0; color: #163f6f; }
          .subtle { color: #4b5563; }
          .meta { text-align: right; }
          .meta-row { display: flex; gap: 12px; justify-content: flex-end; margin-top: 4px; }
          .meta-row strong { min-width: 92px; color: #4b5563; text-align: left; }
          .card { border: 1px solid #d9dde4; border-radius: 8px; padding: 10px 11px; margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; }
          .section-title { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          thead { background: #f3f4f6; }
          th, td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .totals { margin-top: 10px; width: 100%; max-width: 300px; margin-left: auto; break-inside: avoid; page-break-inside: avoid; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals-row.total { font-weight: 700; border-top: 1px solid #d1d5db; margin-top: 4px; padding-top: 8px; }
          .signature { break-inside: avoid; page-break-inside: avoid; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 12px; }
          .signature-line { margin-top: 28px; border-top: 1px solid #111827; padding-top: 6px; }
          .customer-line { margin-top: 76px; }
          .stamp-box { height: 48px; border: 1px dashed #c5cad3; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: 700; }
          .muted { color: #6b7280; }
        `}</style>
        <div className="page">
          <header className="header">
            <div>
              <img src="https://schnellsicherumzug.de/media/brand/hero-logo.jpeg" alt="Logo" className="logo" />
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
