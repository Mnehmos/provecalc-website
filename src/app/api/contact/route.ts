import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

function getTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });
}

const LIMITS = { name: 200, email: 320, subject: 200, message: 10_000 };

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function field(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= limit ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = field(body?.name, LIMITS.name);
    const email = field(body?.email, LIMITS.email);
    const message = field(body?.message, LIMITS.message);
    const rawSubject = body?.subject;
    const subject =
      rawSubject === undefined || rawSubject === "" ? "" : field(rawSubject, LIMITS.subject);

    if (!name || !email || !email.includes("@") || !message || subject === null) {
      return NextResponse.json(
        { error: "Name, a valid email, and a message are required." },
        { status: 400 }
      );
    }

    const transporter = getTransport();

    await transporter.sendMail({
      from: `"ProveCalc Contact" <${process.env.GMAIL_USER}>`,
      to: "mnehmos@themnemosyneresearchinstitute.com",
      replyTo: { name, address: email },
      subject: subject
        ? `[ProveCalc] ${subject}`
        : `[ProveCalc] Message from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin-bottom: 24px;">New Contact Form Submission</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 80px; vertical-align: top;">Name</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Email</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                <a href="mailto:${escapeHtml(email)}" style="color: #b87333;">${escapeHtml(email)}</a>
              </td>
            </tr>
            ${subject ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Subject</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${escapeHtml(subject)}</td>
            </tr>` : ""}
          </table>

          <div style="background: #f9fafb; border-left: 3px solid #b87333; padding: 16px 20px; border-radius: 0 6px 6px 0;">
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent from provecalc.com/contact &mdash; reply directly to respond to ${escapeHtml(name)}
          </p>
        </div>
      `,
      text: `From: ${name} <${email}>${subject ? `\nSubject: ${subject}` : ""}\n\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
