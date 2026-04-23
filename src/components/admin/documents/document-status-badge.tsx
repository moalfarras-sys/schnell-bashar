import { documentStatusLabel } from "@/lib/admin-labels";

export function DocumentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    INTERNAL_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    ADMIN_APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    SIGNATURE_PENDING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
    SIGNED: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
    SUPERSEDED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || styles.DRAFT}`}>
      {documentStatusLabel(status)}
    </span>
  );
}
