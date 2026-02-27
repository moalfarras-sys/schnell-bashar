import { Container } from "@/components/container";

export default function AdminInvoicesLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="space-y-5 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl border-2 border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-20 animate-pulse rounded-xl border-2 border-slate-200 bg-white" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-xl border-2 border-slate-200 bg-white" />
        ))}
      </Container>
    </div>
  );
}

