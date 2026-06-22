import "server-only";

import {
  createDocumentRecord,
  ensureOutputFolders,
  getOutputPath,
  savePdfFile,
  saveDocumentRecord
} from "@/lib/storage";
import { appPath } from "@/lib/routes";
import type { Company, DocumentType, Job } from "@/types/document";

async function launchBrowser() {
  if (process.env.VERCEL) {
    const [{ chromium }, chromiumServerless] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium-min")
    ]);

    return chromium.launch({
      args: chromiumServerless.default.args,
      executablePath: await chromiumServerless.default.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar"
      ),
      headless: true
    });
  }

  const { chromium } = await import("playwright");
  return chromium.launch();
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
}

export function getPdfFileName(job: Job, documentType: DocumentType) {
  const number =
    documentType === "angebot"
      ? job.offerNumber
      : documentType === "vertrag"
        ? job.contractNumber
        : job.invoiceNumber;
  return `${documentType}-${safeFilePart(number.toLowerCase())}.pdf`;
}

export async function exportDocumentPdf({
  baseUrl,
  company,
  documentType,
  job,
  sessionCookie
}: {
  baseUrl: string;
  company: Company;
  documentType: DocumentType;
  job: Job;
  sessionCookie?: string;
}) {
  await ensureOutputFolders();

  const folder =
    documentType === "angebot"
      ? "angebote"
      : documentType === "vertrag"
        ? "vertraege"
        : "rechnungen";
  const fileName = getPdfFileName(job, documentType);
  const filePath = getOutputPath(company.slug, folder, fileName);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1240,
        height: 1754
      }
    });

    if (sessionCookie) {
      await page.setExtraHTTPHeaders({
        cookie: sessionCookie
      });
    }

    await page.goto(`${baseUrl}${appPath(`/print/${documentType}/${job.id}`)}`, {
      waitUntil: "networkidle"
    });
    const pdfBuffer = await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
    const durablePdfPath =
      (await savePdfFile({
        buffer: pdfBuffer,
        companySlug: company.slug,
        fileName,
        folder
      })) ?? filePath;

    await saveDocumentRecord(
      createDocumentRecord({
        company,
        documentType,
        filePath: durablePdfPath,
        job
      })
    );

    return { filePath: durablePdfPath, pdfBuffer };
  } finally {
    await browser.close();
  }
}
