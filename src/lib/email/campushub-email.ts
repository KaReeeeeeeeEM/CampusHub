import "server-only";

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
};

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
  null;

function getEmailConfig(): EmailConfig {
  const user = (
    process.env.SMTP_USER ??
    process.env.GMAIL_USER ??
    process.env.EMAIL_USER ??
    ""
  ).trim();
  const pass = (
    process.env.SMTP_PASSWORD ??
    process.env.GMAIL_APP_PASSWORD ??
    process.env.EMAIL_PASS ??
    ""
  ).replace(/\s+/g, "");
  const host = (
    process.env.SMTP_HOST ??
    process.env.EMAIL_HOST ??
    "smtp.gmail.com"
  ).trim();
  const port = Number(process.env.SMTP_PORT ?? process.env.EMAIL_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
  const fromName = (process.env.EMAIL_FROM_NAME ?? "CampusHub").trim();
  const configuredFrom = (
    process.env.AUTH_EMAIL_FROM ??
    process.env.EMAIL_FROM ??
    user
  ).trim();

  if (!user || !pass) {
    throw new Error(
      "Email delivery is not configured. Set SMTP_USER and SMTP_PASSWORD or GMAIL_USER and GMAIL_APP_PASSWORD.",
    );
  }

  if (!Number.isFinite(port)) {
    throw new Error("SMTP_PORT must be a valid number.");
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromAddress: configuredFrom,
  };
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const config = getEmailConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

export async function verifyEmailTransport() {
  await getTransporter().verify();
}

export async function sendCampusHubEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput) {
  const config = getEmailConfig();
  const info = await getTransporter().sendMail({
    from: {
      name: config.fromName,
      address: config.fromAddress,
    },
    to,
    subject,
    text,
    html,
  });

  console.info("CampusHub email sent", {
    accepted: info.accepted,
    rejected: info.rejected,
    messageId: info.messageId,
  });

  return info;
}
