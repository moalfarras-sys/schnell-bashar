import path from "path";
import { existsSync } from "fs";
import PDFDocument from "pdfkit";

type DrawOptions = {
  x: number;
  y: number;
};

function resolveFirstExisting(paths: string[]): string | null {
  for (const filePath of paths) {
    if (existsSync(filePath)) return filePath;
  }
  return null;
}

function mediaBrandPath(fileName: string): string {
  return path.join(process.cwd(), "public", "media", "brand", fileName);
}

export function resolveCompanySignaturePath(): string | null {
  return resolveFirstExisting([
    mediaBrandPath("company-signature-clean.png"),
    mediaBrandPath("company-signature.png"),
    mediaBrandPath("company-signature.jpg"),
    mediaBrandPath("company-signature.jpeg"),
    path.join(process.cwd(), "public", "media", "gallery", "sig", "sig1.jpeg"),
  ]);
}

export function resolveCompanyStampPath(): string | null {
  return resolveFirstExisting([
    mediaBrandPath("company-stamp-clean.png"),
    mediaBrandPath("company-stamp.png"),
    mediaBrandPath("company-stamp.jpg"),
    mediaBrandPath("company-stamp.jpeg"),
    path.join(process.cwd(), "public", "media", "gallery", "sig", "sig2.jpeg"),
  ]);
}

export function resolveCompanySignatureStampPath(): string | null {
  return resolveFirstExisting([
    mediaBrandPath("company-signature-stamp.png"),
    mediaBrandPath("company-signature-stamp.jpg"),
    mediaBrandPath("company-signature-stamp.jpeg"),
  ]);
}

export function resolveLegacySignaturePath(): string | null {
  const legacy = path.join(process.cwd(), "public", "media", "brand", "signature.png");
  return existsSync(legacy) ? legacy : null;
}

export function drawCompanySignatureAndStamp(
  doc: InstanceType<typeof PDFDocument>,
  sourcePath: string,
  opts: DrawOptions,
): void {
  const { x, y } = opts;

  // Left crop: signature area
  doc.image(sourcePath, x, y, {
    fit: [120, 40],
    valign: "center",
  });

  // Right crop: stamp area
  doc.image(sourcePath, x + 126, y - 8, {
    fit: [54, 54],
    align: "right",
    valign: "center",
  });
}
