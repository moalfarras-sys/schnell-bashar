import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { getImageSlot } from "@/server/content/slots";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const logo = await getImageSlot({
    key: "img.global.brand.logo_header",
    fallbackSrc: "/media/brand/hero-logo.jpeg",
  });

  return (
    <div className="luxury-bg min-h-screen">
      <SiteHeader logoSrc={logo.src} />
      <PageBreadcrumb />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
