export default function AdminLoading() {
  return (
    <div className="grid gap-4">
      <div className="h-16 animate-pulse rounded-2xl bg-slate-700/50" />
      <div className="h-36 animate-pulse rounded-2xl bg-slate-700/40" />
      <div className="h-60 animate-pulse rounded-2xl bg-slate-700/30" />
    </div>
  );
}

