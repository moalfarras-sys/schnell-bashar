import { getImageSlot } from "@/server/content/slots";

const baseUrl = "https://schnellsicherumzug.de";

export async function LocalBusinessSchema() {
  const logo = await getImageSlot({
    key: "img.global.brand.logo_schema",
    fallbackSrc: "/media/brand/hero-logo.jpeg",
  });
  const logoUrl = logo.src.startsWith("http") ? logo.src : `${baseUrl}${logo.src}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Schnell Sicher Umzug",
        url: `${baseUrl}/`,
        logo: logoUrl,
        image: logoUrl,
        telephone: "+491729573681",
        email: "kontakt@schnellsicherumzug.de",
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: `${baseUrl}/`,
        name: "Schnell Sicher Umzug",
        publisher: { "@id": `${baseUrl}/#organization` },
        inLanguage: "de-DE",
      },
      {
        "@type": "MovingCompany",
        "@id": `${baseUrl}/#business`,
        name: "Schnell Sicher Umzug",
        url: `${baseUrl}/`,
        telephone: "+491729573681",
        email: "kontakt@schnellsicherumzug.de",
        description: "Umzug, Entsorgung und Möbelmontage in Berlin und deutschlandweit. 24/7 erreichbar.",
        image: logoUrl,
        logo: logoUrl,
        priceRange: "€€",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Anzengruber Straße 9",
          postalCode: "12043",
          addressLocality: "Berlin",
          addressCountry: "DE",
        },
        areaServed: ["Berlin", "Deutschland"],
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "00:00",
            closes: "23:59",
          },
        ],
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
