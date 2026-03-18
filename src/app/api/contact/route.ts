import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

function getTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,        // mnehmos@themnemosyneresearchinstitute.com
      pass: process.env.GMAIL_APP_PASSWORD, // 16-char Google App Password
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const transporter = getTransport();

    await transporter.sendMail({
      from: `"ProveCalc Contact" <${process.env.GMAIL_USER}>`,
      to: "mnehmos@themnemosyneresearchinstitute.com",
      replyTo: `"${name}" <${email}>`,
      subject: subject
        ? `[ProveCalc] ${subject}`
        : `[ProveCalc] Message from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin-bottom: 24px;">New Contact Form Submission</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 80px; vertical-align: top;">Name</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Email</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                <a href="mailto:${email}" style="color: #b87333;">${email}</a>
              </td>
            </tr>
            ${subject ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Subject</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${subject}</td>
            </tr>` : ""}
          </table>

          <div style="background: #f9fafb; border-left: 3px solid #b87333; padding: 16px 20px; border-radius: 0 6px 6px 0;">
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent from provecalc.com/contact &mdash; reply directly to respond to ${name}
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
