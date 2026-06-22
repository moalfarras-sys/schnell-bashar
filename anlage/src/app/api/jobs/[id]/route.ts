import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { getJob, saveJob } from "@/lib/storage";
import { isActiveCompanyJob } from "@/lib/tenant";
import type { Job } from "@/types/document";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminApi();
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  const job = await getJob(id);

  if (!job || !isActiveCompanyJob(job)) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminApi();
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  const job = (await request.json()) as Job;

  if (
    !job ||
    job.id !== id ||
    !isActiveCompanyJob(job) ||
    !job.customer ||
    job.items.length === 0
  ) {
    return NextResponse.json(
      { error: "Ungültige Auftragsdaten." },
      { status: 400 }
    );
  }

  const savedJob = await saveJob(job);
  return NextResponse.json(savedJob);
}
