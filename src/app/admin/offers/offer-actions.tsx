"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  FileText,
  FileCheck,
  FileArchive,
  XCircle,
  Pencil,
} from "lucide-react";

import { HardDeleteButton } from "@/components/admin/hard-delete-button";
import { Button } from "@/components/ui/button";

export function OfferFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    startTransition(() => {
      router.push(`/admin/offers?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const query = (form.get("search") as string) || "";
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`/admin/offers?${params.toString()}`);
    });
  }

  function handleSortChange(value: "newest" | "oldest") {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    startTransition(() => {
      router.push(`/admin/offers?${params.toString()}`);
    });
  }

  return (
    <div className="mb-6 rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex-1" onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="Suche nach Name, E-Mail oder Telefon..."
              className="w-full rounded-lg border-2 border-slate-300 bg-white py-2 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-5 w-5 text-slate-600" />
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="accepted">Angenommen</option>
            <option value="expired">Abgelaufen</option>
            <option value="cancelled">Storniert</option>
          </select>
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value as "newest" | "oldest")}
            disabled={isPending}
            className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface OfferActionButtonsProps {
  offerId: string;
  offerNo: string | null;
  offerToken: string;
  contractId: string | null;
  contractNo: string | null;
  contractPdfUrl: string | null;
  signedPdfUrl: string | null;
  auditTrailUrl: string | null;
  contractStatus: string | null;
  signatureProvider: string | null;
  orderNo: string | null;
}

export function OfferActionButtons({
  offerId,
  offerNo,
  offerToken,
  contractId,
  contractNo,
  contractPdfUrl,
  signedPdfUrl,
  auditTrailUrl,
  contractStatus,
  signatureProvider,
  orderNo,
}: OfferActionButtonsProps) {
  const router = useRouter();
  const [closing, setClosing] = useState<"offer" | "contract" | null>(null);

  async function closeOffer() {
    setClosing("offer");
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/close`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Angebot konnte nicht geschlossen werden");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Schließen");
    } finally {
      setClosing(null);
    }
  }

  async function closeContract() {
    if (!contractId) return;
    setClosing("contract");
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/close`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Vertrag konnte nicht geschlossen werden");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler beim Schließen");
    } finally {
      setClosing(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/admin/offers/${offerId}/edit`}>
        <Button variant="outline" size="sm" className="gap-1">
          <Pencil className="h-4 w-4" />
          Bearbeiten
        </Button>
      </a>

      <a href={`/api/offers/${offerId}/pdf`} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="h-4 w-4" />
          Angebot PDF
        </Button>
      </a>

      {contractId ? (
        <a href={`/api/contracts/${contractId}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Vertrag PDF
          </Button>
        </a>
      ) : null}

      {!contractId && contractPdfUrl ? (
        <a href={contractPdfUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Vertrag PDF
          </Button>
        </a>
      ) : null}

      {signedPdfUrl || (contractStatus === "SIGNED" && contractPdfUrl) ? (
        <a
          href={
            contractId
              ? `/api/admin/contracts/${contractId}/signed-pdf`
              : (signedPdfUrl || contractPdfUrl || "#")
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="gap-1">
            <FileCheck className="h-4 w-4" />
            {signedPdfUrl ? "Signierter Vertrag" : "Vertrag (Fallback)"}
          </Button>
        </a>
      ) : null}

      {auditTrailUrl ? (
        <a href={auditTrailUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <FileArchive className="h-4 w-4" />
            Audit Trail
          </Button>
        </a>
      ) : null}

      {signatureProvider ? (
        <span className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
          Signaturdienst: {signatureProvider}
        </span>
      ) : null}

      <a href={`/offer/${offerToken}`} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1">
          <FileText className="h-4 w-4" />
          Ansehen
        </Button>
      </a>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={closeOffer}
        disabled={closing === "offer"}
      >
        <XCircle className="h-4 w-4" />
        {closing === "offer" ? "Schließe..." : `Angebot schließen${offerNo ? ` (${offerNo})` : ""}`}
      </Button>

      {contractId && contractStatus !== "SIGNED" && contractStatus !== "CANCELLED" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={closeContract}
          disabled={closing === "contract"}
        >
          <XCircle className="h-4 w-4" />
          {closing === "contract" ? "Schließe..." : `Vertrag schließen${contractNo ? ` (${contractNo})` : ""}`}
        </Button>
      ) : null}

      <HardDeleteButton
        endpoint={`/api/admin/offers/${offerId}/hard-delete`}
        entityLabel={`Angebot ${offerNo ?? offerId}${orderNo ? ` (Auftrag ${orderNo})` : ""}`}
        compact
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
