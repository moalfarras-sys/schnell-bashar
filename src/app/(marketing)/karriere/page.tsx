import { Briefcase, MapPin, Clock } from "lucide-react";

import { Container } from "@/components/container";
import { prisma } from "@/server/db/prisma";

export const metadata = {
  title: "Karriere – Schnell Sicher Umzug",
  description:
    "Werde Teil unseres Teams! Aktuelle Stellenangebote bei Schnell Sicher Umzug in Berlin.",
};

export const revalidate = 300;

export default async function KarrierePage() {
  const jobs = await prisma.jobPosting.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Karriere
        </h1>
        <p className="mt-4 text-base text-slate-700 dark:text-slate-300">
          Wir suchen motivierte Mitarbeiter, die unser Team in Berlin verstärken. Schnell Sicher
          Umzug wächst — und du kannst Teil davon werden.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="premium-surface mt-10 rounded-2xl p-10 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">
            Aktuell keine offenen Stellen
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Initiativbewerbungen sind jederzeit willkommen — schreiben Sie uns an{" "}
            <a
              href="mailto:kontakt@schnellsicherumzug.de"
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              kontakt@schnellsicherumzug.de
            </a>
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="premium-surface rounded-2xl border border-slate-200/60 p-6 dark:border-slate-700/60"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {job.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {job.type}
                    </span>
                    {job.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {job.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.description}
              </p>

              {job.requirements && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Anforderungen
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
                    {job.requirements}
                  </p>
                </div>
              )}

              <div className="mt-5">
                <a
                  href={`mailto:kontakt@schnellsicherumzug.de?subject=Bewerbung: ${encodeURIComponent(job.title)}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Jetzt bewerben
                </a>
              </div>
            </article>
          ))}

          <div className="mt-4 rounded-xl bg-blue-50 p-5 text-center dark:bg-blue-950/30">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Keine passende Stelle gefunden? Initiativbewerbungen an{" "}
              <a
                href="mailto:kontakt@schnellsicherumzug.de"
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                kontakt@schnellsicherumzug.de
              </a>
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
