const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellsicherumzug.de";

export function ServiceSchema(props: {
  name: string;
  description: string;
  areaServed?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: props.name,
    name: props.name,
    description: props.description,
    url: baseUrl,
    provider: {
      "@type": "MovingCompany",
      "@id": `${baseUrl}/#organization`,
      name: "Schnell Sicher Umzug",
      telephone: "+491729573681",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Anzengruber Straße 9",
        addressLocality: "Berlin",
        postalCode: "12043",
        addressCountry: "DE",
      },
    },
    areaServed: {
      "@type": "City",
      name: props.areaServed || "Berlin",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: props.name,
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: props.name,
            description: props.description,
          },
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "EUR",
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}


