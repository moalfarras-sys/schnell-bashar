export type LegalSection = {
  number: number;
  title: string;
  paragraphs: string[];
};

export const MOVING_AGB_SECTIONS: LegalSection[] = [
  {
    number: 1,
    title: "Geltungsbereich",
    paragraphs: [
      "Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen der Firma Schnell Sicher Umzug, Inhaber Baschar Al Hasan, und dem Auftraggeber über die Erbringung von Umzugs-, Entsorgungs- und Montagedienstleistungen.",
      "Abweichende Bedingungen des Auftraggebers werden nur anerkannt, wenn der Auftragnehmer ihrer Geltung ausdrücklich schriftlich zugestimmt hat.",
    ],
  },
  {
    number: 2,
    title: "Leistungserbringung",
    paragraphs: [
      "Der Umfang der zu erbringenden Leistungen ergibt sich aus dem jeweiligen Angebot oder Vertrag. Der Auftragnehmer ist berechtigt, zur Erfüllung des Auftrags qualifizierte Subunternehmer einzusetzen.",
      "Terminänderungen aufgrund höherer Gewalt, Witterungsbedingungen oder behördlicher Anordnungen berechtigen nicht zur Minderung der vereinbarten Vergütung.",
    ],
  },
  {
    number: 3,
    title: "Mitwirkungspflichten des Auftraggebers",
    paragraphs: [
      "Der Auftraggeber stellt sicher, dass sämtliche Zugangswege zum Be- und Entladeort frei, sicher und begehbar sind. Haltezonen für das Umzugsfahrzeug sind rechtzeitig zu organisieren.",
      "Wertgegenstände, Bargeld, Schmuck, wichtige Dokumente und Datenträger sind vom Auftraggeber selbst zu transportieren. Der Auftragnehmer übernimmt hierfür keine Haftung.",
      "Der Auftraggeber hat den Auftragnehmer rechtzeitig über besondere Umstände zu informieren, zum Beispiel Zugangseinschränkungen, schwer zugängliche Räume oder besonders schwere und empfindliche Gegenstände.",
    ],
  },
  {
    number: 4,
    title: "Haftung und Versicherung",
    paragraphs: [
      "Der Auftragnehmer haftet für Schäden an Transportgut, die durch sein Verschulden oder das Verschulden seiner Erfüllungsgehilfen verursacht werden, im Rahmen der gesetzlichen Bestimmungen gemäß §§ 451 ff. HGB.",
      "Die Haftung ist auf den gemeinen Wert der beschädigten Gegenstände begrenzt, sofern nicht grobe Fahrlässigkeit oder Vorsatz vorliegt. Für nicht ordnungsgemäß vom Auftraggeber verpackte Gegenstände wird keine Haftung übernommen.",
      "Schäden sind unverzüglich, spätestens jedoch innerhalb von 24 Stunden nach der Leistungserbringung, schriftlich beim Auftragnehmer anzuzeigen.",
    ],
  },
  {
    number: 5,
    title: "Zahlungsbedingungen",
    paragraphs: [
      "Die vereinbarte Vergütung ist nach vollständiger Leistungserbringung fällig und per Überweisung oder Barzahlung zu begleichen, sofern nichts anderes vereinbart wurde.",
      "Alle Preise verstehen sich netto zuzüglich der gesetzlichen Umsatzsteuer von derzeit 19 Prozent.",
      "Bei Zahlungsverzug ist der Auftragnehmer berechtigt, Verzugszinsen in Höhe von 5 Prozentpunkten über dem jeweiligen Basiszinssatz der EZB zu berechnen.",
    ],
  },
  {
    number: 6,
    title: "Stornierung und Rücktritt",
    paragraphs: [
      "Der Auftraggeber kann den Vertrag jederzeit vor dem Umzugstermin kündigen. Bei Rücktritt werden folgende Stornogebühren fällig:",
      "Bis 7 Tage vor Umzugstermin: 30 Prozent der Auftragssumme.\n6 bis 3 Tage vor Umzugstermin: 50 Prozent der Auftragssumme.\n2 Tage vor Umzugstermin: 80 Prozent der Auftragssumme.\nAm Umzugstag: 100 Prozent der Auftragssumme.",
      "Dem Kunden bleibt der Nachweis vorbehalten, dass ein geringerer Schaden entstanden ist.",
    ],
  },
  {
    number: 7,
    title: "Datenschutz",
    paragraphs: [
      "Der Auftragnehmer erhebt und verarbeitet personenbezogene Daten des Auftraggebers ausschließlich zum Zwecke der Vertragsdurchführung und im Einklang mit der Datenschutz-Grundverordnung sowie dem Bundesdatenschutzgesetz.",
      "Eine Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragserfüllung erforderlich ist, etwa an eingesetzte Subunternehmer, oder eine gesetzliche Verpflichtung besteht.",
    ],
  },
  {
    number: 8,
    title: "Schlussbestimmungen",
    paragraphs: [
      "Sollten einzelne Bestimmungen dieses Vertrages oder dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.",
      "Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist Berlin.",
      "Änderungen und Ergänzungen dieses Vertrages sowie dieser AGB bedürfen der Schriftform. Mündliche Nebenabreden bestehen nicht.",
    ],
  },
];
