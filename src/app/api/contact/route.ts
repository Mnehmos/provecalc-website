import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
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

    const resend = getResend();

    await resend.emails.send({
      from: "ProveCalc Contact <noreply@themnemosyneresearchinstitute.com>",
      to: "mnehmos@themnemosyneresearchinstitute.com",
      replyTo: email,
      subject: subject
        ? `[ProveCalc Contact] ${subject}`
        : `[ProveCalc Contact] Message from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a2e; margin-bottom: 24px;">New Contact Form Submission</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 80px;">Name</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">
                <a href="mailto:${email}" style="color: #b87333;">${email}</a>
              </td>
            </tr>
            ${subject ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subject</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${subject}</td>
            </tr>` : ''}
          </table>

          <div style="background: #f9fafb; border-left: 3px solid #b87333; padding: 16px 20px; border-radius: 0 6px 6px 0;">
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sent from provecalc.com/contact — reply directly to respond to ${name}
          </p>
        </div>
      `,
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
