import { NextResponse } from "next/server";
import { z } from "zod";

import { QuoteDraftSchema } from "@/domain/quote/schema";
import { createQuote } from "@/server/quotes/service";

export const runtime = "nodejs";

const createSchema = z.object({
  draft: QuoteDraftSchema,
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const firstFieldError = Object.values(flattened.fieldErrors)
      .flat()
      .find((msg): msg is string => typeof msg === "string" && msg.length > 0);

    return NextResponse.json(
      {
        error: firstFieldError || "Ungültige Eingabedaten",
        details: flattened,
      },
      { status: 400 },
    );
  }

  try {
    const snapshot = await createQuote(parsed.data.draft);
    return NextResponse.json({ quoteId: snapshot.quoteId, snapshot }, { status: 201 });
  } catch (error) {
    const isValidationError = error instanceof z.ZodError;
    const message = isValidationError
      ? (error.issues.find((issue) => issue.message)?.message ?? "Ungültige Eingabedaten")
      : error instanceof Error
        ? error.message
        : "Angebot konnte nicht erstellt werden.";
    const status = isValidationError ? 400 : /nicht verfügbar|Distanz/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
