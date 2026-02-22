import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { FloatingWidgetContainer } from "@/components/floating-widget-container";
import { StickyCta } from "@/components/sticky-cta";
import { ExitIntentModal } from "@/components/exit-intent-modal";
import { LocalBusinessSchema } from "@/components/schema/local-business";
import { FloatingParticles } from "@/components/floating-particles";
import { getImageSlot } from "@/server/content/slots";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const logo = await getImageSlot({
    key: "img.global.brand.logo_header",
    fallbackSrc: "/media/brand/hero-logo.jpeg",
    fallbackAlt: "Schnell Sicher Umzug",
  });

  return (
    <div className="luxury-bg min-h-screen">
      <LocalBusinessSchema />
      <FloatingParticles />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-soft dark:focus:bg-slate-800 dark:focus:text-white"
        href="#content"
      >
        Zum Inhalt springen
      </a>
      <SiteHeader logoSrc={logo.src} />
      <PageBreadcrumb />
      <main id="content">{children}</main>
      <FloatingWidgetContainer />
      <ExitIntentModal />
      <StickyCta />
      <SiteFooter />
    </div>
  );
}
