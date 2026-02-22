export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: "pricing" | "booking" | "service" | "contact";
};

export const faqDatabase: FaqEntry[] = [
  {
    id: "q1",
    question: "Wie viel kostet ein Umzug?",
    answer:
      "Die Kosten hängen von m³, Entfernung, Zugang (Etage/Aufzug) und gewünschter Priorität ab. Nutzen Sie den Preisrechner oder das Buchungsformular für eine Live-Schätzung.",
    keywords: ["kosten", "preis", "wie viel", "angebot"],
    category: "pricing",
  },
  {
    id: "q2",
    question: "Wie schnell bekomme ich einen Termin?",
    answer:
      "Je nach Paket (Günstig/Standard/Express) und Kapazität können wir unterschiedliche Zeitfenster anbieten. Im Kalender sehen Sie verfügbare Termine.",
    keywords: ["termin", "schnell", "slot", "express"],
    category: "booking",
  },
  {
    id: "q3",
    question: "Kann ich ohne lange Texte buchen?",
    answer:
      "Ja. Das Buchungsformular ist größtenteils aus Auswahlfeldern aufgebaut. Notizen sind optional und kurz.",
    keywords: ["wizard", "ohne text", "freitext", "buchen"],
    category: "booking",
  },
  {
    id: "q4",
    question: "Welche Dinge werden nicht entsorgt?",
    answer:
      "Gefährliche Stoffe, Chemikalien, Batterien, Reifen und Sondermüll sind ausgeschlossen.",
    keywords: ["nicht", "entsorgung", "batterie", "chemikalien", "sondermüll"],
    category: "service",
  },
  {
    id: "q5",
    question: "Wie kontaktiere ich Schnell Sicher Umzug?",
    answer:
      "Sie erreichen uns telefonisch unter +49 172 9573681, per E-Mail an kontakt@schnellsicherumzug.de oder via WhatsApp.",
    keywords: ["kontakt", "telefon", "email", "whatsapp"],
    category: "contact",
  },
];
