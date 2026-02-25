"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Send,
  Loader2,
  Download,
  FileText,
  FileCheck,
  FileArchive,
  ExternalLink,
  XCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HardDeleteButton } from "@/components/admin/hard-delete-button";

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

interface ResendSigningButtonProps {
  offerId: string;
}

export function ResendSigningButton({ offerId }: ResendSigningButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleResend() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/resend-signing`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        provider?: "DOCUSIGN" | "INTERNAL";
        fallbackActivated?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Fehler beim erneuten Senden");
      }
      const successText = data.message || "Signatur-Link erneut gesendet";
      setMessage({ type: "success", text: successText });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Ein Fehler ist aufgetreten",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={handleResend}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Erneut senden
      </Button>
      {message && (
        <span
          className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </span>
      )}
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
  signingUrl: string | null;
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
  signingUrl,
  signatureProvider,
  orderNo,
}: OfferActionButtonsProps) {
  const router = useRouter();
  const [closing, setClosing] = useState<"offer" | "contract" | null>(null);
  const showResend = contractStatus === "PENDING_SIGNATURE";

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

      {contractId && (
        <a href={`/api/contracts/${contractId}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Vertrag PDF
          </Button>
        </a>
      )}
      {!contractId && contractPdfUrl && (
        <a href={contractPdfUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Vertrag PDF
          </Button>
        </a>
      )}

      {(signedPdfUrl || (contractStatus === "SIGNED" && contractPdfUrl)) && (
        <a
          href={signedPdfUrl || contractPdfUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="gap-1">
            <FileCheck className="h-4 w-4" />
            {signedPdfUrl ? "Signierter Vertrag" : "Vertrag (Fallback)"}
          </Button>
        </a>
      )}

      {auditTrailUrl && (
        <a href={auditTrailUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <FileArchive className="h-4 w-4" />
            Audit Trail
          </Button>
        </a>
      )}

      {signingUrl && contractStatus === "PENDING_SIGNATURE" && (
        <a href={signingUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1">
            <ExternalLink className="h-4 w-4" />
            {signatureProvider === "INTERNAL" ? "Internen Signatur-Link öffnen" : "Signatur-Link öffnen"}
          </Button>
        </a>
      )}

      <a href={`/offer/${offerToken}`} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1">
          <FileText className="h-4 w-4" />
          Ansehen
        </Button>
      </a>

      {showResend && <ResendSigningButton offerId={offerId} />}

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

      {contractId && contractStatus !== "SIGNED" && contractStatus !== "CANCELLED" && (
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
      )}

      <HardDeleteButton
        endpoint={`/api/admin/offers/${offerId}/hard-delete`}
        entityLabel={`Angebot ${offerNo ?? offerId}${orderNo ? ` (Auftrag ${orderNo})` : ""}`}
        compact
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}



