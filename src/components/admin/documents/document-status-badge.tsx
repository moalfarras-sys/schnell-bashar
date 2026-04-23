export function DocumentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    INTERNAL_REVIEW: "bg-amber-100 text-amber-800",
    ADMIN_APPROVED: "bg-blue-100 text-blue-800",
    SIGNATURE_PENDING: "bg-indigo-100 text-indigo-800",
    SIGNED: "bg-green-100 text-green-800",
    SUPERSEDED: "bg-zinc-100 text-zinc-700",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}
