import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";

import {
  testDocuSignJwtDeepCheck,
  validateDocuSignConfig,
} from "../src/lib/docusign";

type KeySource = "inline" | "path" | "missing";

function normalizeInlineKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

function resolveKeyCandidate(): { source: KeySource; value: string | null; pathHint?: string } {
  const inline = process.env.DOCUSIGN_PRIVATE_KEY?.trim();
  if (inline) {
    return { source: "inline", value: normalizeInlineKey(inline) };
  }

  const keyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || "./docusign-private.key";
  const absolutePath = path.resolve(process.cwd(), keyPath);
  try {
    const file = readFileSync(absolutePath, "utf8").trim();
    return { source: "path", value: file, pathHint: absolutePath };
  } catch {
    return { source: "missing", value: null, pathHint: absolutePath };
  }
}

function detectKeyType(value: string | null): "PRIVATE" | "PUBLIC" | "UNKNOWN" | "MISSING" {
  if (!value) return "MISSING";
  if (/-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/.test(value)) return "PRIVATE";
  if (/-----BEGIN PUBLIC KEY-----/.test(value)) return "PUBLIC";
  return "UNKNOWN";
}

function printLength(name: string, value: string | undefined): void {
  const len = value?.trim().length ?? 0;
  console.log(`${name}: ${len > 0 ? `present (length=${len})` : "missing"}`);
}

async function main(): Promise<void> {
  console.log("=== DocuSign Diagnostics ===");

  printLength("DOCUSIGN_INTEGRATION_KEY", process.env.DOCUSIGN_INTEGRATION_KEY);
  printLength("DOCUSIGN_USER_ID", process.env.DOCUSIGN_USER_ID);
  printLength("DOCUSIGN_ACCOUNT_ID", process.env.DOCUSIGN_ACCOUNT_ID);
  printLength("DOCUSIGN_WEBHOOK_SECRET", process.env.DOCUSIGN_WEBHOOK_SECRET);
  console.log(`DOCUSIGN_BASE_PATH: ${process.env.DOCUSIGN_BASE_PATH || "account-d.docusign.com"}`);

  const keyCandidate = resolveKeyCandidate();
  const keyType = detectKeyType(keyCandidate.value);
  const keyLength = keyCandidate.value?.length ?? 0;

  console.log("\n--- Private Key ---");
  console.log(`source: ${keyCandidate.source}`);
  if (keyCandidate.source === "path") {
    console.log(`path: ${keyCandidate.pathHint}`);
  }
  if (keyCandidate.source === "missing" && keyCandidate.pathHint) {
    console.log(`expected path: ${keyCandidate.pathHint}`);
  }
  console.log(`detected type: ${keyType}`);
  console.log(`length: ${keyLength}`);

  const validation = validateDocuSignConfig();
  console.log("\n--- Config Validation ---");
  console.log(`configValid: ${validation.configValid}`);
  console.log(`privateKeySource: ${validation.privateKeySource}`);
  console.log(`privateKeyFormatValid: ${validation.privateKeyFormatValid}`);
  console.log(`privateKeyLoaded: ${validation.privateKeyLoaded}`);
  if (validation.errors.length) {
    console.log(`errors: ${validation.errors.join(" | ")}`);
  }

  console.log("\n--- Deep JWT Check ---");
  const deep = await testDocuSignJwtDeepCheck();
  console.log(`ok: ${deep.ok}`);
  console.log(`code: ${deep.code ?? "none"}`);
  console.log(`message: ${deep.message}`);
  console.log(`resolvedRestBasePath: ${deep.restBasePath ?? "n/a"}`);

  if (!deep.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Diagnostic crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
