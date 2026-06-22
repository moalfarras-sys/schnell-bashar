import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { createJobFromTemplate, getJobTemplate } from "@/lib/storage";
import { activeCompanyId, isAllowedCompanyId } from "@/lib/tenant";

export async function POST(request: Request) {
  const authError = await requireAdminApi();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as { companyId?: string };
  const companyId = body.companyId ?? activeCompanyId;

  if (!isAllowedCompanyId(companyId)) {
    return NextResponse.json({ error: "Firma nicht erlaubt." }, { status: 403 });
  }

  const template = await getJobTemplate(companyId);

  if (!template) {
    return NextResponse.json(
      { error: "Kein Vorlage-Auftrag vorhanden." },
      { status: 400 }
    );
  }

  const job = await createJobFromTemplate(template, companyId);
  return NextResponse.json(job);
}
