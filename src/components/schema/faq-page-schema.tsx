export interface FAQPageSchema {
    question: string;
    answer: string;
}

export function generateFAQPageSchema(faqs: FAQPageSchema[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };
}

export function FAQPageSchemaScript({ faqs }: { faqs: FAQPageSchema[] }) {
    const schema = generateFAQPageSchema(faqs);

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
