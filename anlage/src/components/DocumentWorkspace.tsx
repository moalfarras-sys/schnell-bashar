"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { JobForm } from "@/components/forms/JobForm";
import { Button } from "@/components/ui/Button";
import { calculateTotals } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/number-format";
import { appPath, publicAssetPath } from "@/lib/routes";
import { activeCompanyId as tenantCompanyId } from "@/lib/tenant";
import {
  ContractDocument,
  OfferDocument
} from "@/templates/angebot/OfferDocument";
import { InvoiceDocument } from "@/templates/rechnung/InvoiceDocument";
import type {
  Company,
  Customer,
  DocumentType,
  Job,
  JobStatus
} from "@/types/document";

const A4_WIDTH_PX = 794;
const MIN_PREVIEW_SCALE = 0.28;

const statusLabels: Record<JobStatus, string> = {
  entwurf: "Entwurf",
  angebot_gesendet: "Angebot gesendet",
  auftrag_bestaetigt: "Auftrag bestätigt",
  rechnung_erstellt: "Rechnung erstellt",
  bezahlt: "Bezahlt"
};

const statusClass: Record<JobStatus, string> = {
  entwurf: "bg-slate-100 text-slate-800 border-slate-300",
  angebot_gesendet: "bg-orange-50 text-orange-800 border-orange-300",
  auftrag_bestaetigt: "bg-blue-50 text-blue-800 border-blue-300",
  rechnung_erstellt: "bg-emerald-50 text-emerald-800 border-emerald-300",
  bezahlt: "bg-slate-950 text-white border-slate-950"
};

function getNextStatus(documentType: DocumentType): JobStatus {
  if (documentType === "angebot") {
    return "angebot_gesendet";
  }
  if (documentType === "vertrag") {
    return "auftrag_bestaetigt";
  }
  return "rechnung_erstellt";
}

export function DocumentWorkspace({
  companies,
  initialJobs,
  initialCustomers
}: {
  companies: Company[];
  initialJobs: Job[];
  initialCustomers: Customer[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeCompanyId, setActiveCompanyId] = useState(
    companies[0]?.companyId ?? tenantCompanyId
  );
  const [activeJobId, setActiveJobId] = useState(
    initialJobs.find(
      (job) => job.companyId === (companies[0]?.companyId ?? tenantCompanyId)
    )
      ?.id ??
      initialJobs[0]?.id ??
      ""
  );
  const [documentType, setDocumentType] = useState<DocumentType>("angebot");
  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState("Bereit");
  const [exportStatus, setExportStatus] = useState("");
  const [search, setSearch] = useState("");
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState<number | undefined>();

  const company =
    companies.find((item) => item.companyId === activeCompanyId) ?? companies[0];

  const companyJobs = useMemo(
    () => jobs.filter((job) => job.companyId === activeCompanyId),
    [activeCompanyId, jobs]
  );

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    const seen = new Set<string>();
    initialCustomers
      .filter((customer) => customer.companyId === activeCompanyId)
      .forEach((customer) => {
        const key = [
          customer.name.trim().toLowerCase(),
          customer.email.trim().toLowerCase(),
          customer.phone.trim(),
          customer.mobile.trim()
        ].join("|");

        if (customer.name.trim() && !seen.has(key)) {
          seen.add(key);
          map.set(customer.id, customer);
        }
      });
    companyJobs.forEach((job) => {
      const customer = job.customer;
      const key = [
        customer.name.trim().toLowerCase(),
        customer.email.trim().toLowerCase(),
        customer.phone.trim(),
        customer.mobile.trim()
      ].join("|");

      if (customer.name.trim() && !seen.has(key)) {
        seen.add(key);
        map.set(customer.id, customer);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCompanyId, companyJobs, initialCustomers]);

  const activeJob = useMemo(
    () =>
      companyJobs.find((job) => job.id === activeJobId) ??
      companyJobs[0],
    [activeJobId, companyJobs]
  );

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return companyJobs;
    }
    return companyJobs.filter((job) =>
      [
        job.customer.name,
        job.customer.city,
        job.offerNumber,
        job.invoiceNumber,
        job.contractNumber,
        statusLabels[job.status]
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [companyJobs, search]);

  const totals = activeJob ? calculateTotals(activeJob.items) : null;

  useEffect(() => {
    function updatePreviewScale() {
      const frame = previewFrameRef.current;
      const content = previewContentRef.current;

      if (!frame || !content) {
        return;
      }

      const frameStyles = window.getComputedStyle(frame);
      const horizontalPadding =
        Number.parseFloat(frameStyles.paddingLeft) +
        Number.parseFloat(frameStyles.paddingRight);
      const verticalPadding =
        Number.parseFloat(frameStyles.paddingTop) +
        Number.parseFloat(frameStyles.paddingBottom);
      const availableWidth = Math.max(0, frame.clientWidth - horizontalPadding);
      const nextScale = Math.min(
        1,
        Math.max(MIN_PREVIEW_SCALE, availableWidth / A4_WIDTH_PX)
      );

      setPreviewScale(nextScale);
      setPreviewHeight(Math.ceil(content.scrollHeight * nextScale + verticalPadding));
    }

    updatePreviewScale();
    const resizeObserver = new ResizeObserver(updatePreviewScale);

    if (previewFrameRef.current) {
      resizeObserver.observe(previewFrameRef.current);
    }
    if (previewContentRef.current) {
      resizeObserver.observe(previewContentRef.current);
    }

    window.addEventListener("resize", updatePreviewScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
    };
  }, [activeJob, documentType]);

  async function saveJob(jobToSave = activeJob) {
    if (!jobToSave) {
      return null;
    }

    setSaveStatus("Speichert...");
    const response = await fetch(appPath(`/api/jobs/${jobToSave.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobToSave)
    });

    if (!response.ok) {
      setSaveStatus("Speichern fehlgeschlagen");
      return null;
    }

    const savedJob = (await response.json()) as Job;
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === savedJob.id ? savedJob : job))
    );
    setSaveStatus("Gespeichert. PDF kann heruntergeladen werden.");
    return savedJob;
  }

  async function createNewJob() {
    setSaveStatus("Neuer Auftrag...");
    const response = await fetch(appPath("/api/jobs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: activeCompanyId })
    });

    if (!response.ok) {
      setSaveStatus("Neuer Auftrag fehlgeschlagen");
      return;
    }

    const newJob = (await response.json()) as Job;
    setJobs((currentJobs) => [...currentJobs, newJob]);
    setActiveJobId(newJob.id);
    setDocumentType("angebot");
    setStep(1);
    setSaveStatus("Neuer Auftrag angelegt");
  }

  async function exportPdf(type: DocumentType) {
    if (!activeJob) {
      return;
    }

    setDocumentType(type);
    setStep(5);
    setExportStatus("PDF wird erstellt...");

    const jobForExport = {
      ...activeJob,
      status:
        activeJob.status === "bezahlt" ? activeJob.status : getNextStatus(type)
    };
    const savedJob = await saveJob(jobForExport);

    if (!savedJob) {
      setExportStatus("PDF-Export abgebrochen: Auftrag konnte nicht speichern.");
      return;
    }

    const response = await fetch(appPath("/api/export-pdf"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: savedJob.id, documentType: type, download: true })
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setExportStatus(result?.error ?? "PDF-Export fehlgeschlagen");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fileName =
      disposition.match(/filename="([^"]+)"/)?.[1] ??
      `${type}-${savedJob.id}.pdf`;
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);

    setExportStatus("Gespeichert. PDF kann heruntergeladen werden.");
    await createNewJob();
  }

  function updateActiveJob(updatedJob: Job) {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === updatedJob.id ? updatedJob : job))
    );
    setSaveStatus("Ungespeicherte Änderungen");
  }

  if (!activeJob) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8">
        <section className="mx-auto grid max-w-xl gap-4 rounded-md border border-slate-300 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#f26b21]">
              Büro-Tool
            </p>
            <h1 className="text-2xl font-black tracking-tight">
              Neuer Start
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Bitte Firma auswählen und den ersten Auftrag anlegen.
            </p>
          </div>
          <select
            className="h-11 rounded-md border border-slate-400 bg-white px-3 text-sm font-bold"
            value={activeCompanyId}
            onChange={(event) => {
              setActiveCompanyId(event.target.value);
              setSearch("");
              setStep(1);
            }}
          >
            {companies.map((item) => (
              <option key={item.companyId} value={item.companyId}>
                {item.displayName}
              </option>
            ))}
          </select>
          <Button onClick={createNewJob} variant="primary">
            Neuer Auftrag
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <header className="no-print border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-3 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Image
              src={publicAssetPath(company.logoPath)}
              alt={company.displayName}
              width={176}
              height={56}
              unoptimized
              priority
              style={{ width: "auto" }}
              className="h-12 w-48 shrink-0 object-contain object-left sm:h-14 sm:w-60"
            />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#f26b21]">
                Büro-Tool
              </p>
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
                Admin Dokumente
              </h1>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto xl:flex xl:flex-wrap xl:items-center">
            <select
              className="col-span-2 h-10 min-w-0 rounded-md border border-slate-400 bg-white px-3 text-sm font-bold sm:col-span-1 xl:w-56"
              value={activeCompanyId}
              onChange={(event) => {
                const nextCompanyId = event.target.value;
                const nextJob = jobs.find((job) => job.companyId === nextCompanyId);
                setActiveCompanyId(nextCompanyId);
                setActiveJobId(nextJob?.id ?? "");
                setSearch("");
                setStep(1);
              }}
            >
              {companies.map((item) => (
                <option key={item.companyId} value={item.companyId}>
                  {item.displayName}
                </option>
              ))}
            </select>
            <Button onClick={createNewJob} variant="primary" className="w-full whitespace-nowrap">
              Neuer Auftrag
            </Button>
            <Button onClick={() => setStep(5)} className="w-full whitespace-nowrap">Vorschau</Button>
            <Button onClick={() => void exportPdf("angebot")} className="w-full whitespace-nowrap">Angebot PDF</Button>
            <Button onClick={() => void exportPdf("vertrag")} className="w-full whitespace-nowrap">Vertrag PDF</Button>
            <Button onClick={() => void exportPdf("rechnung")} variant="primary" className="w-full whitespace-nowrap">
              Rechnung PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] min-[1900px]:grid-cols-[360px_minmax(620px,760px)_minmax(0,1fr)]">
        <aside className="no-print grid min-w-0 content-start gap-4 lg:gap-5">
          <section className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Dashboard</h2>
              <span className="text-sm font-bold text-slate-600">
                {companyJobs.length} Aufträge
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="font-black">{companyJobs.filter((job) => job.status === "entwurf").length}</p>
                <p className="font-semibold text-slate-700">Entwürfe</p>
              </div>
              <div className="rounded-md bg-orange-50 p-3">
                <p className="font-black">{companyJobs.filter((job) => job.status === "angebot_gesendet").length}</p>
                <p className="font-semibold text-orange-800">Angebote</p>
              </div>
              <div className="rounded-md bg-blue-50 p-3">
                <p className="font-black">{companyJobs.filter((job) => job.status === "auftrag_bestaetigt").length}</p>
                <p className="font-semibold text-blue-800">Aufträge</p>
              </div>
              <div className="rounded-md bg-emerald-50 p-3">
                <p className="font-black">{companyJobs.filter((job) => ["rechnung_erstellt", "bezahlt"].includes(job.status)).length}</p>
                <p className="font-semibold text-emerald-800">Rechnungen</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Bestehende Aufträge</h2>
            <input
              className="mt-3 h-11 w-full rounded-md border border-slate-400 px-3 text-sm font-semibold outline-none focus:border-[#f26b21] focus:ring-2 focus:ring-[#f26b21]/25"
              placeholder="Kunde suchen..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="mt-3 grid max-h-[540px] gap-2 overflow-auto pr-1">
              {filteredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    setActiveJobId(job.id);
                    setStep(1);
                  }}
                  className={`rounded-md border p-3 text-left transition hover:border-[#f26b21] ${
                    job.id === activeJob.id
                      ? "border-[#f26b21] bg-orange-50"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-950">{job.customer.name}</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {formatDate(job.moveDate)} · {job.offerNumber}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusClass[job.status]}`}>
                      {statusLabels[job.status]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="no-print min-w-0 rounded-md border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <JobForm
            job={activeJob}
            customers={customers}
            step={step}
            onStepChange={setStep}
            onChange={updateActiveJob}
            onSave={() => void saveJob()}
            saveStatus={saveStatus}
          />
        </section>

        <section className="grid min-w-0 content-start gap-4 lg:col-span-2 min-[1900px]:col-span-1">
          <div className="no-print rounded-md border border-slate-300 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:flex xl:items-center xl:justify-between">
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                <Button
                  variant={documentType === "angebot" ? "primary" : "secondary"}
                  onClick={() => setDocumentType("angebot")}
                >
                  Angebot
                </Button>
                <Button
                  variant={documentType === "vertrag" ? "primary" : "secondary"}
                  onClick={() => setDocumentType("vertrag")}
                >
                  Vertrag
                </Button>
                <Button
                  variant={documentType === "rechnung" ? "primary" : "secondary"}
                  onClick={() => setDocumentType("rechnung")}
                >
                  Rechnung
                </Button>
              </div>
              <div className="min-w-0 text-left text-sm font-semibold text-slate-700 xl:text-right">
                {totals ? (
                  <p>
                    Netto {formatCurrency(totals.netCents)} · Brutto{" "}
                    <strong>{formatCurrency(totals.grossCents)}</strong>
                  </p>
                ) : null}
                <p className="max-w-full truncate xl:max-w-[680px]">{exportStatus}</p>
              </div>
            </div>
          </div>

          <div
            ref={previewFrameRef}
            className="print-root max-w-full overflow-hidden rounded-md bg-slate-300 p-2 sm:p-5"
            style={{ height: previewHeight }}
          >
            <div
              ref={previewContentRef}
              className="print-preview-layer w-fit"
              style={{
                transform: `scale(${previewScale})`,
                width: A4_WIDTH_PX
              }}
            >
              {documentType === "angebot" ? (
                <OfferDocument company={company} job={activeJob} />
              ) : documentType === "vertrag" ? (
                <ContractDocument company={company} job={activeJob} />
              ) : (
                <InvoiceDocument company={company} job={activeJob} />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
