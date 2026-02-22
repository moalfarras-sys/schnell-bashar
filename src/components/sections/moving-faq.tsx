import { FAQSection } from "@/components/ui/faq-accordion";
import { FAQPageSchemaScript } from "@/components/schema/faq-page-schema";

const movingFAQs = [
    {
        question: "Wie funktioniert die Online-Buchung?",
        answer:
            "Unser Buchungsprozess ist einfach: Wählen Sie Ihren Service, geben Sie Details wie Volumen und Standort ein, wählen Sie einen Termin und senden Sie Ihre Anfrage ab. Wir melden uns innerhalb von 24 Stunden mit einem konkreten Angebot.",
    },
    {
        question: "Wie wird der Preis berechnet?",
        answer:
            "Der Preis richtet sich nach mehreren Faktoren: Volumen (m³), Distanz, Stockwerk, Zeitaufwand und Zusatzleistungen wie Montage oder Verpackung. Nutzen Sie unseren kostenlosen Preisrechner für eine erste Orientierung.",
    },
    {
        question: "Sind meine Möbel versichert?",
        answer:
            "Ja, wir arbeiten mit einer Transportversicherung. Ihre Möbel und Gegenstände sind während des Umzugs abgesichert. Details zur Versicherung erhalten Sie mit dem Angebot.",
    },
    {
        question: "Wie kurzfristig kann ich einen Umzug buchen?",
        answer:
            "Wir versuchen, auch kurzfristige Anfragen zu ermöglichen. Bei Verfügbarkeit sind Termine innerhalb von 3-7 Tagen möglich. Buchen Sie frühzeitig für mehr Flexibilität bei der Terminwahl.",
    },
    {
        question: "Was passiert mit meinem Sperrmüll?",
        answer:
            "Wir entsorgen Sperrmüll fachgerecht und umweltbewusst. Wiederverwertbare Materialien werden recycelt. Sie erhalten einen transparenten Nachweis über die Entsorgung.",
    },
    {
        question: "Bieten Sie auch Verpackungsmaterial an?",
        answer:
            "Ja, auf Wunsch stellen wir Umzugskartons, Luftpolsterfolie, Packpapier und weiteres Material bereit. Diese Leistung kann direkt im Buchungsformular ausgewählt werden.",
    },
    {
        question: "Arbeiten Sie deutschlandweit?",
        answer:
            "Ja, wir führen Umzüge und Entsorgungen in ganz Deutschland durch. Nutzen Sie unser Online-Formular oder rufen Sie uns an, um Details zu Ihrem Standort zu besprechen.",
    },
    {
        question: "Kann ich meinen Termin nachträglich ändern?",
        answer:
            "Terminänderungen sind nach Absprache möglich. Kontaktieren Sie uns so früh wie möglich, damit wir eine alternative Lösung finden können. Kurzfristige Änderungen können ggf. Gebühren verursachen.",
    },
];

export function MovingFAQSection() {
    return (
        <>
            <FAQPageSchemaScript faqs={movingFAQs} />
            <FAQSection
                title="Häufig gestellte Fragen"
                description="Antworten auf die wichtigsten Fragen rund um Umzug und Entsorgung."
                items={movingFAQs}
                className="border-t border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30"
            />
        </>
    );
}
