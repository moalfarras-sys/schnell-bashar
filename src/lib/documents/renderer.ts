import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import chromium from "@sparticuz/chromium-min";
import { PDFDocument } from "pdf-lib";
import puppeteer from "puppeteer-core";

import { AgbAppendixTemplate } from "@/lib/documents/templates/agb-appendix-template";
import { AngebotTemplate } from "@/lib/documents/templates/angebot-template";
import { AuftragTemplate } from "@/lib/documents/templates/auftrag-template";
import { MahnungTemplate } from "@/lib/documents/templates/mahnung-template";
import { RechnungTemplate } from "@/lib/documents/templates/rechnung-template";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

async function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.VERCEL) {
    return await chromium.executablePath();
  }
  throw new Error("PUPPETEER_EXECUTABLE_PATH is required outside Vercel for HTML/CSS PDF rendering.");
}

async function renderMarkup(element: Parameters<typeof renderTemplate>[0]) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(renderTemplate(element));
}

function renderTemplate(input: {
  type: "ANGEBOT" | "RECHNUNG" | "AUFTRAG_VERTRAG" | "MAHNUNG" | "AGB_APPENDIX";
  number: string;
  snapshot: DocumentVersionSnapshot;
}) {
  switch (input.type) {
    case "ANGEBOT":
      return AngebotTemplate({ number: input.number, snapshot: input.snapshot });
    case "RECHNUNG":
      return RechnungTemplate({ number: input.number, snapshot: input.snapshot });
    case "AUFTRAG_VERTRAG":
      return AuftragTemplate({ number: input.number, snapshot: input.snapshot });
    case "MAHNUNG":
      return MahnungTemplate({ number: input.number, snapshot: input.snapshot });
    case "AGB_APPENDIX":
      return AgbAppendixTemplate({ number: input.number });
  }
}

export async function renderDocumentPdf(input: {
  type: "ANGEBOT" | "RECHNUNG" | "AUFTRAG_VERTRAG" | "MAHNUNG" | "AGB_APPENDIX";
  number: string;
  snapshot: DocumentVersionSnapshot;
  includeAgbAppendix?: boolean;
}) {
  const executablePath = await resolveExecutablePath();
  const browser = await puppeteer.launch({
    executablePath,
    args: process.env.VERCEL ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const html = "<!DOCTYPE html>" + (await renderMarkup(input));
    await page.setContent(html, { waitUntil: "networkidle0" });
    const mainPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    if (!input.includeAgbAppendix) {
      return Buffer.from(mainPdf);
    }

    const appendixPage = await browser.newPage();
    const appendixHtml =
      "<!DOCTYPE html>" + (await renderMarkup({ type: "AGB_APPENDIX", number: `${input.number}-AGB`, snapshot: input.snapshot }));
    await appendixPage.setContent(appendixHtml, { waitUntil: "networkidle0" });
    const appendixPdf = await appendixPage.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const merged = await PDFDocument.create();
    for (const sourceBytes of [mainPdf, appendixPdf]) {
      const source = await PDFDocument.load(sourceBytes);
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((pageToAdd) => merged.addPage(pageToAdd));
    }
    return Buffer.from(await merged.save());
  } finally {
    await browser.close();
  }
}

export async function savePdfSample(outputPath: string, buffer: Buffer) {
  const absolute = resolve(outputPath);
  await writeFile(absolute, buffer);
  return absolute;
}
