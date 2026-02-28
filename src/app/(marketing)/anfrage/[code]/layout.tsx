import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anfragestatus",
  description: "Gesch?tzter Statusbereich f?r Ihre Anfrage.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AnfrageCodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
