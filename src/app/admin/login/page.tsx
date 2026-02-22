import { Container } from "@/components/container";
import { LoginForm } from "@/app/admin/login/login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = nextParam ?? "/admin";

  return (
    <div className="luxury-bg-dark min-h-screen">
      <Container className="py-16">
        <div className="mx-auto max-w-md rounded-3xl border-2 border-slate-600 bg-slate-800 p-8 shadow-lg">
          <div className="text-2xl font-extrabold tracking-tight text-white">Verwaltung – Anmeldung</div>
          <p className="mt-2 text-sm font-semibold text-slate-200">
            Bitte melden Sie sich an, um Preise, Katalog und Aufträge zu verwalten.
          </p>

          <LoginForm next={next} />
        </div>
      </Container>
    </div>
  );
}

