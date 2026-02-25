import nodemailer from "nodemailer";

const DEFAULT_FROM = "Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>";
const SAFE_MODE_FLAG = "SAFE_MODE_EXTERNAL_IO";

function isSafeModeEnabled() {
  const raw = String(process.env[SAFE_MODE_FLAG] ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function getMailer(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || DEFAULT_FROM;

  if (!host || !user || !pass) {
    console.error(
      "[mailer] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env. " +
        "Optionally SMTP_FROM (default: Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>)",
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: port || 587,
    secure: port === 465,
    auth: { user, pass },
    from,
  });
}

export function getDefaultFrom(): string {
  return process.env.SMTP_FROM || DEFAULT_FROM;
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

  const transporter = getMailer();
  if (!transporter) {
    return { success: false, error: "SMTP not configured" };
  }

  const from = options.from || getDefaultFrom();

  try {
    await transporter.sendMail({
      ...options,
      from,
    });
    console.log(
      `[mailer] Email sent to ${Array.isArray(options.to) ? options.to.join(",") : options.to}`,
    );
    return { success: true };
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
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return !!(host && user && pass);
}
