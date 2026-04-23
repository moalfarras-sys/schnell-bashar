import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Inter, Manrope } from "next/font/google";

import { LocalBusinessSchema } from "@/components/schema/local-business";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const gaId = process.env.NEXT_PUBLIC_GA_ID;
const canonicalHost = "https://schnellsicherumzug.de";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });
const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(canonicalHost),
  title: {
    default: "Umzugsunternehmen Berlin | Umzug, Entsorgung & Montage 24/7",
    template: "%s | Schnell Sicher Umzug",
  },
  description:
    "Schnell Sicher Umzug in Berlin: Umzug, Entsorgung und Möbelmontage 24/7 erreichbar. Transparente Preise, schnelle Termine und professionelle Durchführung.",
  keywords: [
    "Schnell Sicher Umzug",
    "Umzugsunternehmen Berlin",
    "Umzug Berlin",
    "Entsorgung Berlin",
    "Sperrmüll Berlin",
    "Möbelmontage Berlin",
    "Umzug deutschlandweit",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Umzugsunternehmen Berlin | Umzug, Entsorgung & Montage 24/7",
    description:
      "Schnell Sicher Umzug in Berlin: Umzug, Entsorgung und Möbelmontage 24/7 erreichbar. Transparente Preise, schnelle Termine und professionelle Durchführung.",
    url: canonicalHost,
    siteName: "Schnell Sicher Umzug",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Umzugsunternehmen Berlin | Umzug, Entsorgung & Montage 24/7",
    description:
      "Schnell Sicher Umzug in Berlin: Umzug, Entsorgung und Möbelmontage 24/7 erreichbar.",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: "/media/brand/hero-logo.jpeg",
    apple: "/media/brand/hero-logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} ${inter.className}`}>
        <ThemeProvider>
          <LocalBusinessSchema />
          {children}
        </ThemeProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
