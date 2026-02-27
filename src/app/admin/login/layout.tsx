import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="luxury-bg min-h-screen">
      <SiteHeader />
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.16),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.22),transparent_40%)]" />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
