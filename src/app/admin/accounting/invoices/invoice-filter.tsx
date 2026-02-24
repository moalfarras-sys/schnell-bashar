"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, Filter } from "lucide-react";

export function InvoiceFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") || "all";
  const currentSearch = searchParams.get("search") || "";

  function handleStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    startTransition(() => {
      router.push(`/admin/accounting/invoices?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const query = (form.get("search") as string) || "";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`/admin/accounting/invoices?${params.toString()}`);
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
              placeholder="Suche nach Name, E-Mail oder Rechnungsnr..."
              className="w-full rounded-lg border-2 border-slate-300 bg-white py-2 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-600" />
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Alle Status</option>
            <option value="unpaid">Unbezahlt</option>
            <option value="partial">Teilbezahlt</option>
            <option value="paid">Bezahlt</option>
            <option value="overdue">Ueberfaellig</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
      </div>
    </div>
  );
}

