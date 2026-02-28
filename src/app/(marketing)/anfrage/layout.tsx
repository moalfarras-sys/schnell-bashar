import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anfrage verfolgen",
  description:
    "Status Ihrer Umzugsanfrage mit Tracking-Code pr?fen. Schnell, sicher und transparent.",
  alternates: {
    canonical: "/anfrage",
  },
};

export default function AnfrageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
