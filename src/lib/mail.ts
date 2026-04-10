import "server-only";
import nodemailer from "nodemailer";

type MailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
  attachments?: nodemailer.SendMailOptions["attachments"];
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
});

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getFromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
}

export async function sendMail(payload: MailPayload, retries = 2) {
  const from = payload.from || getFromAddress();
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !from) {
    throw new Error("Missing SMTP env vars");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt === 0) {
        await transporter.verify();
      }
      return await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo || process.env.MAIL_REPLY_TO,
        attachments: payload.attachments,
      });
    } catch (err) {
      lastError = err;
      if (attempt < retries) await wait(500 * (attempt + 1));
    }
  }

  throw lastError;
}

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

export function getMailFrom() {
  return getFromAddress();
}

export async function verifyMailConnection() {
  if (!isMailConfigured()) {
    return {
      ok: false as const,
      code: "NOT_CONFIGURED",
      message: "SMTP is not fully configured.",
    };
  }

  try {
    await transporter.verify();
    return {
      ok: true as const,
      code: "OK",
      message: "SMTP connection verified.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response =
      error && typeof error === "object" && "response" in error
        ? String((error as { response?: unknown }).response ?? "")
        : "";

    return {
      ok: false as const,
      code: "AUTH_FAILED",
      message,
      response: response || undefined,
    };
  }
}

export const templates = {
  contactForm: (data: { name: string; email: string; message: string }) => ({
    subject: `New contact form from ${data.name}`,
    html: `<h2>New Contact</h2>
<p><b>Name:</b> ${data.name}</p>
<p><b>Email:</b> ${data.email}</p>
<p><b>Message:</b><br/>${data.message.replace(/\n/g, "<br/>")}</p>`,
    text: `Name: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`,
  }),
  bookingConfirmation: (data: { name: string; bookingId: string }) => ({
    subject: `Booking confirmed #${data.bookingId}`,
    html: `<h2>Booking Confirmed</h2><p>Hi ${data.name}, your booking is confirmed.</p>`,
    text: `Hi ${data.name}, your booking is confirmed.`,
  }),
  adminNotification: (data: { title: string; body: string }) => ({
    subject: data.title,
    html: `<h2>${data.title}</h2><p>${data.body}</p>`,
    text: `${data.title}\n${data.body}`,
  }),
};
