import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { LocalBusinessSchema } from "@/components/schema/local-business";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const gaId = process.env.NEXT_PUBLIC_GA_ID;

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });
const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellsicherumzug.de";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Schnell Sicher Umzug - Umzug & Entsorgung deutschlandweit",
    template: "%s - Schnell Sicher Umzug",
  },
  description:
    "Premium Umzug, Montage und Entsorgung in ganz Deutschland. Angebot berechnen, Termin wählen, Auftrag senden - schnell und strukturiert.",
  keywords: [
    "Schnell Sicher Umzug",
    "Umzug Berlin",
    "Umzug deutschlandweit",
    "Sperrmüll Abholung",
    "Entsorgung Berlin",
    "Entrümpelung",
    "Umzugsfirma",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Schnell Sicher Umzug - Umzug & Entsorgung deutschlandweit",
    description:
      "Super schnelle & absolut sichere Umzüge. Fachgerechte Entsorgung, strukturierte Anfrage und schnelle Rückmeldung.",
    url: baseUrl,
    siteName: "Schnell Sicher Umzug",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Schnell Sicher Umzug",
    description:
      "Stressfrei umziehen mit erfahrenen Profis. Umzug, Entsorgung und Montage mit schneller Anfrage.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} ${inter.className}`}>
        <ThemeProvider>
          <LocalBusinessSchema />
          {children}
        </ThemeProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}


