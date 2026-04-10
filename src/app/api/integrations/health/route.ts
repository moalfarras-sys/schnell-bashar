import { NextRequest, NextResponse } from "next/server";

import { isEmailConfigured } from "@/server/email/mailer";
import { verifyMailConnection } from "@/lib/mail";

export const runtime = "nodejs";

function hasValue(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  const orsReady = hasValue(process.env.ORS_API_KEY);
  const smtpReady = isEmailConfigured();
  const smtpDeep = deep ? await verifyMailConnection() : undefined;
  const smtpOk = smtpDeep ? smtpDeep.ok : smtpReady;

  return NextResponse.json({
    ok: orsReady && smtpOk,
    checkedAt: new Date().toISOString(),
    signingMode: "INTERNAL_ONLY",
    integrations: {
      ors: {
        ready: orsReady,
        baseUrl:
          (process.env.ORS_BASE_URL || "https://api.openrouteservice.org").replace(
            /\/+$/,
            "",
          ),
      },
      smtp: {
        ready: smtpOk,
        configured: smtpReady,
        deep: deep
          ? {
              ok: smtpDeep?.ok ?? false,
              code: smtpDeep?.code ?? "UNKNOWN",
              message: smtpDeep?.message ?? "SMTP deep check did not run.",
              response: smtpDeep && "response" in smtpDeep ? smtpDeep.response : undefined,
            }
          : undefined,
      },
      docusign: {
        enabled: false,
        ready: false,
        mode: "disabled_by_design",
        message: "DocuSign wurde entfernt. Das System nutzt nur die interne Signatur.",
        deep: deep
          ? {
              ok: false,
              code: "DISABLED",
              message: "DocuSign wurde entfernt.",
              restBasePath: null,
            }
          : undefined,
      },
    },
  });
}
