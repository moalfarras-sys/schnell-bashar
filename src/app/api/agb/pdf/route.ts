import { NextResponse } from "next/server";
import { generateAGBPDF } from "@/server/pdf/generate-agb";

export async function GET() {
  try {
    const pdfBuffer = await generateAGBPDF();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="AGB-Schnell-Sicher-Umzug.pdf"',
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[agb/pdf] Generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
