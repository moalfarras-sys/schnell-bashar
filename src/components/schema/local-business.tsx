import { getImageSlot } from "@/server/content/slots";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellumzug-berlin.de";

export async function LocalBusinessSchema() {
  const logo = await getImageSlot({
    key: "img.global.brand.logo_schema",
    fallbackSrc: "/media/brand/hero-logo.jpeg",
  });
  const logoUrl = logo.src.startsWith("http") ? logo.src : `${baseUrl}${logo.src}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "MovingCompany",
    "@id": `${baseUrl}/#organization`,
    name: "Schnell Sicher Umzug",
    alternateName: "SSU Berlin",
    url: baseUrl,
    logo: logoUrl,
    image: logoUrl,
    telephone: "+491729573681",
    email: "kontakt@schnellsicherumzug.de",
    description:
      "Professionelle Umzüge, Entsorgung und Montage — strukturiert, transparent und deutschlandweit. 24/7 erreichbar.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Anzengruber Straße 9",
      addressLocality: "Berlin",
      addressRegion: "Berlin",
      postalCode: "12043",
      addressCountry: "DE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 52.48,
      longitude: 13.43,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
    priceRange: "â‚¬â‚¬",
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Bank Transfer",
    areaServed: [
      { "@type": "City", name: "Berlin" },
      { "@type": "City", name: "Hamburg" },
      { "@type": "City", name: "München" },
      { "@type": "City", name: "Köln" },
      { "@type": "City", name: "Frankfurt am Main" },
      { "@type": "Country", name: "Germany" },
    ],
    sameAs: ["https://wa.me/491729573681"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Umzugsdienstleistungen",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Privatumzug",
            description: "Kompletter Umzugsservice für Privatpersonen.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Büroumzug",
            description: "Professioneller Büro- und Gewerbeumzug.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Entsorgung / Sperrmüll",
            description: "Fachgerechte Abholung und Entsorgung von Sperrmüll.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Möbelmontage",
            description: "Ab- und Aufbau von Möbeln inklusive Verpackung.",
          },
        },
      ],
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      reviewCount: "48",
      bestRating: "5",
      worstRating: "1",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Familie K." },
        reviewRating: { "@type": "Rating", ratingValue: "5" },
        reviewBody:
          "Sehr freundlich, pünktlich und gut organisiert. Der Umzug lief stressfrei und sauber.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Büroservice M." },
        reviewRating: { "@type": "Rating", ratingValue: "5" },
        reviewBody:
          "Klare Kommunikation und faire Preise. Besonders stark bei kurzfristiger Planung.",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

