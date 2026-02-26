import { NextRequest, NextResponse } from "next/server";

import {
  getResolvedDocuSignRestBasePath,
  testDocuSignJwtDeepCheck,
  validateDocuSignConfig,
} from "@/lib/docusign";
import { isInternalOnlySigning } from "@/server/signing/signing-mode";
import { isEmailConfigured } from "@/server/email/mailer";

export const runtime = "nodejs";

function hasValue(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

export async function GET(req: NextRequest) {
  const internalOnlySigning = await isInternalOnlySigning();
  const deep = req.nextUrl.searchParams.get("deep") === "1";
  const orsReady = hasValue(process.env.ORS_API_KEY);
  const smtpReady = isEmailConfigured();
  const docusignConfig = validateDocuSignConfig();
  const deepResult = deep && !internalOnlySigning ? await testDocuSignJwtDeepCheck() : null;
  const webhookRequired = process.env.NODE_ENV === "production";
  const webhookReady = webhookRequired ? docusignConfig.webhookSecretPresent : true;
  const docusignReady = deep && !internalOnlySigning
    ? docusignConfig.configValid && webhookReady && !!deepResult?.ok
    : docusignConfig.configValid && webhookReady;

  return NextResponse.json({
    ok: orsReady && smtpReady && (internalOnlySigning ? true : docusignReady),
    checkedAt: new Date().toISOString(),
    signingMode: internalOnlySigning ? "INTERNAL_ONLY" : "HYBRID",
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
        enabled: !internalOnlySigning,
        ready: internalOnlySigning ? false : docusignReady,
        configValid: docusignConfig.configValid,
        privateKeySource: docusignConfig.privateKeySource,
        privateKeyFormatValid: docusignConfig.privateKeyFormatValid,
        privateKeyLoaded: docusignConfig.privateKeyLoaded,
        webhookSecretSet: docusignConfig.webhookSecretPresent,
        webhookRequired,
        restBasePath: getResolvedDocuSignRestBasePath(),
        errors: docusignConfig.errors,
        deep: deep && !internalOnlySigning
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
