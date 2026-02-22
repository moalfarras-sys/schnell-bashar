import { NextRequest, NextResponse } from "next/server";

import {
  getResolvedDocuSignRestBasePath,
  testDocuSignJwtDeepCheck,
  validateDocuSignConfig,
} from "@/lib/docusign";
import { isEmailConfigured } from "@/server/email/mailer";

export const runtime = "nodejs";

function hasValue(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  const orsReady = hasValue(process.env.ORS_API_KEY);
  const smtpReady = isEmailConfigured();
  const docusignConfig = validateDocuSignConfig();
  const deepResult = deep ? await testDocuSignJwtDeepCheck() : null;
  const webhookRequired = process.env.NODE_ENV === "production";
  const webhookReady = webhookRequired ? docusignConfig.webhookSecretPresent : true;
  const docusignReady = deep
    ? docusignConfig.configValid && webhookReady && !!deepResult?.ok
    : docusignConfig.configValid && webhookReady;

  return NextResponse.json({
    ok: orsReady && smtpReady && docusignReady,
    checkedAt: new Date().toISOString(),
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
        ready: smtpReady,
      },
      docusign: {
        ready: docusignReady,
        configValid: docusignConfig.configValid,
        privateKeySource: docusignConfig.privateKeySource,
        privateKeyFormatValid: docusignConfig.privateKeyFormatValid,
        privateKeyLoaded: docusignConfig.privateKeyLoaded,
        webhookSecretSet: docusignConfig.webhookSecretPresent,
        webhookRequired,
        restBasePath: getResolvedDocuSignRestBasePath(),
        errors: docusignConfig.errors,
        deep: deep
          ? {
              ok: deepResult?.ok ?? false,
              code: deepResult?.code ?? null,
              message: deepResult?.message ?? null,
              restBasePath: deepResult?.restBasePath ?? null,
            }
          : undefined,
      },
    },
  });
}
