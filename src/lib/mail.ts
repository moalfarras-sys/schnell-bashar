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
  maxConnections: 5,
  maxMessages: 100,
});

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getFromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
}

export async function sendMail(payload: MailPayload, retries = 2) {
  const from = payload.from || getFromAddress();
  if (!from) {
    throw new Error("MAIL_FROM/SMTP_FROM is not configured");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await transporter.verify();
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
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getMailFrom() {
  return getFromAddress();
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
