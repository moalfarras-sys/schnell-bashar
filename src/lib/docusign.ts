import { createPrivateKey } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import docusign, { type ApiClient, type EnvelopesApi } from "docusign-esign";

const SCOPES = ["signature", "impersonation"];

type PrivateKeySource = "inline" | "path" | "missing";
export type DocuSignAuthErrorCode =
  | "INVALID_PRIVATE_KEY"
  | "CONSENT_REQUIRED"
  | "INVALID_INTEGRATION_OR_USER"
  | "NETWORK_OR_DOCUSIGN_UNAVAILABLE"
  | "UNKNOWN";

export type DocuSignConfigValidation = {
  integrationKeyPresent: boolean;
  userIdPresent: boolean;
  accountIdPresent: boolean;
  privateKeySource: PrivateKeySource;
  privateKeyFormatValid: boolean;
  privateKeyLoaded: boolean;
  webhookSecretPresent: boolean;
  configValid: boolean;
  errors: string[];
};

export type DocuSignDeepCheckResult = {
  ok: boolean;
  code?: DocuSignAuthErrorCode | "CONFIG_INVALID";
  message: string;
  restBasePath: string | null;
};

let cachedClient: ApiClient | null = null;
let tokenExpiresAt = 0;
let resolvedRestBasePath: string | null = null;

function normalizeInlineKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

function readKeyFromPath(): string | null {
  const keyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || "./docusign-private.key";
  const absolutePath = path.resolve(process.cwd(), keyPath);
  try {
    return readFileSync(absolutePath, "utf8").trim();
  } catch {
    return null;
  }
}

function resolvePrivateKeyCandidate(): {
  source: PrivateKeySource;
  value: string | null;
} {
  const inlineKey = process.env.DOCUSIGN_PRIVATE_KEY?.trim();
  if (inlineKey) {
    return { source: "inline", value: normalizeInlineKey(inlineKey) };
  }

  const fileKey = readKeyFromPath();
  if (fileKey) {
    return { source: "path", value: fileKey };
  }

  return { source: "missing", value: null };
}

function hasPrivateKeyHeader(value: string): boolean {
  return /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/.test(value);
}

function getErrorBody(error: unknown): { error?: string; error_description?: string } | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { body?: unknown } }).response?.body === "object"
  ) {
    return (error as { response?: { body?: { error?: string; error_description?: string } } })
      .response?.body;
  }
  return undefined;
}

function classifyDocuSignAuthError(error: unknown): {
  code: DocuSignAuthErrorCode;
  message: string;
} {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const lowered = rawMessage.toLowerCase();
  const body = getErrorBody(error);
  const bodyErrorCode = body?.error?.toLowerCase();
  const bodyErrorDescription = body?.error_description;

  if (bodyErrorCode === "consent_required" || lowered.includes("consent_required")) {
    return {
      code: "CONSENT_REQUIRED",
      message:
        "DocuSign JWT fehlgeschlagen: Benutzer-Consent fehlt. Bitte Consent-URL einmalig aufrufen.",
    };
  }

  if (
    lowered.includes("secretorprivatekey") ||
    lowered.includes("private key") ||
    lowered.includes("no key") ||
    bodyErrorCode === "invalid_client"
  ) {
    return {
      code: "INVALID_PRIVATE_KEY",
      message: "DocuSign JWT fehlgeschlagen: Private Key ist ungültig oder falsch formatiert.",
    };
  }

  if (
    bodyErrorCode === "invalid_grant" ||
    lowered.includes("invalid grant") ||
    lowered.includes("user_not_found") ||
    lowered.includes("integration key") ||
    lowered.includes("unauthorized_client")
  ) {
    return {
      code: "INVALID_INTEGRATION_OR_USER",
      message: `DocuSign JWT fehlgeschlagen: Integration Key/User ID prüfen. Detail: ${bodyErrorDescription || rawMessage}`,
    };
  }

  if (
    lowered.includes("timeout") ||
    lowered.includes("econn") ||
    lowered.includes("network") ||
    lowered.includes("enotfound")
  ) {
    return {
      code: "NETWORK_OR_DOCUSIGN_UNAVAILABLE",
      message:
        "DocuSign JWT fehlgeschlagen: Netzwerk oder DocuSign derzeit nicht erreichbar.",
    };
  }

  return {
    code: "UNKNOWN",
    message: `DocuSign JWT fehlgeschlagen: ${bodyErrorDescription || rawMessage}`,
  };
}

function resolvePrivateKeyOrThrow(): string {
  const validation = validateDocuSignConfig();
  if (!validation.privateKeyLoaded) {
    throw new Error(
      `[DOCUSIGN_AUTH:INVALID_PRIVATE_KEY] ${validation.errors.join(" | ") || "Private Key fehlt oder ist ungültig."}`,
    );
  }

  const candidate = resolvePrivateKeyCandidate();
  if (!candidate.value) {
    throw new Error("[DOCUSIGN_AUTH:INVALID_PRIVATE_KEY] Private Key konnte nicht geladen werden.");
  }

  return candidate.value;
}

function resolveAccountBasePath(userInfo: { accounts?: Array<{ accountId?: string; baseUri?: string; isDefault?: string | boolean }> }): string | null {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const accounts = Array.isArray(userInfo?.accounts) ? userInfo.accounts : [];

  const selected =
    accounts.find((account) => account?.accountId === accountId) ??
    accounts.find((account) => account?.isDefault === "true" || account?.isDefault === true) ??
    null;

  if (selected?.baseUri) {
    return `${String(selected.baseUri).replace(/\/+$/, "")}/restapi`;
  }

  return null;
}

export function validateDocuSignConfig(): DocuSignConfigValidation {
  const integrationKeyPresent = !!process.env.DOCUSIGN_INTEGRATION_KEY?.trim();
  const userIdPresent = !!process.env.DOCUSIGN_USER_ID?.trim();
  const accountIdPresent = !!process.env.DOCUSIGN_ACCOUNT_ID?.trim();
  const webhookSecretPresent = !!process.env.DOCUSIGN_WEBHOOK_SECRET?.trim();

  const keyCandidate = resolvePrivateKeyCandidate();
  const privateKeyFormatValid = !!keyCandidate.value && hasPrivateKeyHeader(keyCandidate.value);

  let privateKeyLoaded = false;
  if (privateKeyFormatValid && keyCandidate.value) {
    try {
      createPrivateKey(keyCandidate.value);
      privateKeyLoaded = true;
    } catch {
      privateKeyLoaded = false;
    }
  }

  const errors: string[] = [];
  if (!integrationKeyPresent) errors.push("DOCUSIGN_INTEGRATION_KEY fehlt.");
  if (!userIdPresent) errors.push("DOCUSIGN_USER_ID fehlt.");
  if (!accountIdPresent) errors.push("DOCUSIGN_ACCOUNT_ID fehlt.");

  if (keyCandidate.source === "missing") {
    errors.push("DocuSign Private Key fehlt (DOCUSIGN_PRIVATE_KEY oder DOCUSIGN_PRIVATE_KEY_PATH).");
  } else if (!privateKeyFormatValid) {
    errors.push("DocuSign Private Key Format ist ungültig (BEGIN ... PRIVATE KEY erwartet).");
  } else if (!privateKeyLoaded) {
    errors.push("DocuSign Private Key konnte nicht als asymmetrischer Schlüssel geladen werden.");
  }

  const configValid = integrationKeyPresent && userIdPresent && accountIdPresent && privateKeyLoaded;

  return {
    integrationKeyPresent,
    userIdPresent,
    accountIdPresent,
    privateKeySource: keyCandidate.source,
    privateKeyFormatValid,
    privateKeyLoaded,
    webhookSecretPresent,
    configValid,
    errors,
  };
}

export function isDocuSignReady(): boolean {
  return validateDocuSignConfig().configValid;
}

export function getResolvedDocuSignRestBasePath(): string | null {
  return resolvedRestBasePath;
}

export function resetDocuSignClientCache(): void {
  cachedClient = null;
  tokenExpiresAt = 0;
  resolvedRestBasePath = null;
}

export async function getDocuSignClient(): Promise<ApiClient> {
  const now = Date.now();
  if (cachedClient && tokenExpiresAt > now + 60_000) {
    return cachedClient;
  }

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY?.trim();
  const userId = process.env.DOCUSIGN_USER_ID?.trim();

  if (!integrationKey || !userId) {
    throw new Error(
      "[DOCUSIGN_AUTH:INVALID_INTEGRATION_OR_USER] Missing DOCUSIGN_INTEGRATION_KEY or DOCUSIGN_USER_ID.",
    );
  }

  const privateKey = resolvePrivateKeyOrThrow();

  const apiClient = new docusign.ApiClient();
  apiClient.setOAuthBasePath(process.env.DOCUSIGN_BASE_PATH || "account-d.docusign.com");

  try {
    const jwtResult = await apiClient.requestJWTUserToken(
      integrationKey,
      userId,
      SCOPES,
      privateKey,
      3600,
    );

    const accessToken = jwtResult.body.access_token;
    apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

    const userInfo = await apiClient.getUserInfo(accessToken);
    const basePath = resolveAccountBasePath(userInfo);

    if (!basePath) {
      throw new Error(
        "[DOCUSIGN_AUTH:INVALID_INTEGRATION_OR_USER] Account konnte nicht aufgelöst werden (DOCUSIGN_ACCOUNT_ID prüfen).",
      );
    }

    apiClient.setBasePath(basePath);
    resolvedRestBasePath = basePath;

    cachedClient = apiClient;
    tokenExpiresAt = now + Math.max(0, (jwtResult.body.expires_in - 300) * 1000);

    return apiClient;
  } catch (error) {
    const classified = classifyDocuSignAuthError(error);
    console.error(`[DocuSign] ${classified.code}: ${classified.message}`);
    throw new Error(`[DOCUSIGN_AUTH:${classified.code}] ${classified.message}`);
  }
}

export async function testDocuSignJwtDeepCheck(): Promise<DocuSignDeepCheckResult> {
  const validation = validateDocuSignConfig();
  if (!validation.configValid) {
    return {
      ok: false,
      code: "CONFIG_INVALID",
      message: validation.errors.join(" | "),
      restBasePath: null,
    };
  }

  try {
    resetDocuSignClientCache();
    await getDocuSignClient();
    return {
      ok: true,
      message: "JWT-Auth erfolgreich.",
      restBasePath: getResolvedDocuSignRestBasePath(),
    };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const codeMatch = text.match(/\[DOCUSIGN_AUTH:([A-Z_]+)\]/);
    const code = (codeMatch?.[1] as DocuSignAuthErrorCode | undefined) || "UNKNOWN";
    return {
      ok: false,
      code,
      message: text,
      restBasePath: getResolvedDocuSignRestBasePath(),
    };
  }
}

export async function getEnvelopesApi(): Promise<EnvelopesApi> {
  const apiClient = await getDocuSignClient();
  return new docusign.EnvelopesApi(apiClient);
}

export function getDocuSignAccountId(): string {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error("DOCUSIGN_ACCOUNT_ID is not set");
  }
  return accountId;
}

export async function resendDocuSignEnvelope(envelopeId: string): Promise<void> {
  const envelopesApi = await getEnvelopesApi();
  const accountId = getDocuSignAccountId();

  await envelopesApi.update(accountId, envelopeId, {
    resendEnvelope: "true",
    envelope: { status: "sent" },
  });
}

