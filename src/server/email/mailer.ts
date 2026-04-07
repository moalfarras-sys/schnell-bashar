import nodemailer from "nodemailer";

import { getMailFrom, isMailConfigured, sendMail } from "@/lib/mail";

const DEFAULT_FROM = "Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>";
const SAFE_MODE_FLAG = "SAFE_MODE_EXTERNAL_IO";
const TRANSIENT_SMTP_PATTERNS = [
  /\b454\b/,
  /\b4\.3\.0\b/,
  /try again later/i,
  /temporar/i,
];

function isSafeModeEnabled() {
  const raw = String(process.env[SAFE_MODE_FLAG] ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function getMailer(): nodemailer.Transporter | null {
  return null;
}

export function getDefaultFrom(): string {
  return getMailFrom() || DEFAULT_FROM;
}

function shouldRetryEmail(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const response =
    error && typeof error === "object" && "response" in error
      ? String((error as { response?: unknown }).response ?? "")
      : "";
  const combined = `${message}\n${response}`;
  return TRANSIENT_SMTP_PATTERNS.some((pattern) => pattern.test(combined));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(
  options: nodemailer.SendMailOptions,
): Promise<{ success: boolean; error?: string }> {
  if (isSafeModeEnabled()) {
    console.warn(
      `[mailer] SAFE MODE active (${SAFE_MODE_FLAG}=true): skipping email send to ${
        Array.isArray(options.to) ? options.to.join(",") : options.to
      }`,
    );
    return { success: true };
  }

  if (!isMailConfigured()) {
    return { success: false, error: "SMTP not configured" };
  }

  const from = typeof options.from === "string" ? options.from : getDefaultFrom();

  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await sendMail(
          {
            to: options.to as string | string[],
            subject: options.subject || "(no subject)",
            html: options.html ? String(options.html) : "",
            text: options.text ? String(options.text) : undefined,
            replyTo: options.replyTo ? String(options.replyTo) : undefined,
            from,
            attachments: options.attachments,
          },
          1,
        );
        console.log(
          `[mailer] Email sent to ${Array.isArray(options.to) ? options.to.join(",") : options.to}`,
        );
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isLastAttempt = attempt === 2;
        const retryable = shouldRetryEmail(err);

        console.error("[mailer] Send failed:", message);
        if (err && typeof err === "object" && "response" in err) {
          console.error("[mailer] SMTP response:", (err as any).response);
        }

        if (!retryable || isLastAttempt) {
          return { success: false, error: message };
        }

        console.warn(`[mailer] transient SMTP failure, retrying attempt ${attempt + 1}/2`);
        await sleep(1500);
      }
    }

    return { success: false, error: "SMTP send failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mailer] Send failed:", message);
    if (err && typeof err === "object" && "response" in err) {
      console.error("[mailer] SMTP response:", (err as any).response);
    }
    return { success: false, error: message };
  }
}

export function isEmailConfigured(): boolean {
  return isMailConfigured();
}
