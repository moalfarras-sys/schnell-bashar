import { Briefcase, MapPin, Clock } from "lucide-react";
import { Container } from "@/components/container";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
 title: "Karriere – Schnell Sicher Umzug",
 description:
 "Werde Teil unseres Teams! Aktuelle Stellenangebote bei Schnell Sicher Umzug in Berlin.",
};

export default async function KarrierePage() {
 let jobs: any[] = [];

 try {
 jobs = await prisma.jobPosting.findMany({
 where: { isActive: true },
 orderBy: { createdAt: "desc" },
 });
 } catch {
 jobs = [];
 }

 return (
 <Container className="py-14">
 <div className="max-w-3xl">
 <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
 Karriere
 </h1>
 <p className="mt-4 text-base text-slate-700 dark:text-slate-300">
 Werde Teil unseres Teams! Hier findest du unsere aktuellen Stellenangebote.
 </p>

 <div className="mt-10 space-y-6">
 {jobs.length === 0 ? (
 <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
 Aktuell haben wir keine offenen Stellen.
 </div>
 ) : (
 jobs.map((job: any) => (
 <div
 key={job.id}
 className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
 >
 <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
 {job.title}
 </h2>

 <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
 {job.location ? (
 <span className="inline-flex items-center gap-2">
 <MapPin className="h-4 w-4" />
 {job.location}
 </span>
 ) : null}

 {job.type ? (
 <span className="inline-flex items-center gap-2">
 <Briefcase className="h-4 w-4" />
 {job.type}
 </span>
 ) : null}

 {job.hours ? (
 <span className="inline-flex items-center gap-2">
 <Clock className="h-4 w-4" />
 {job.hours}
 </span>
 ) : null}
 </div>

 {job.description ? (
 <div className="prose prose-slate mt-4 max-w-none dark:prose-invert">
 <p>{job.description}</p>
 </div>
 ) : null}
 </div>
 ))
 )}
 </div>
 </div>
 </Container>
 );
}

