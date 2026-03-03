import { Resend } from "resend";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:5000";
const APP_NAME = "CozyWatch";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(
  toEmail: string,
  username: string,
  token: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping verification email");
    return;
  }
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `Verify your ${APP_NAME} account`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: #161b22; border-radius: 12px; padding: 32px; border: 1px solid #30363d;">
            <h1 style="margin: 0 0 8px; font-size: 24px; color: #4caf50;">🎬 ${APP_NAME}</h1>
            <p style="color: #8b949e; margin: 0 0 24px; font-size: 14px;">Your cozy media tracker</p>
            <h2 style="font-size: 20px; margin: 0 0 16px;">Hey ${username}, welcome aboard!</h2>
            <p style="color: #c9d1d9; line-height: 1.6;">Click the button below to verify your email address and activate your account.</p>
            <a href="${verifyUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #4caf50; color: #000; font-weight: 700; text-decoration: none; border-radius: 8px; font-size: 15px;">
              ✅ Verify Email
            </a>
            <p style="color: #8b949e; font-size: 13px; margin: 0;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #30363d; margin: 24px 0;">
            <p style="color: #484f58; font-size: 12px; margin: 0;">Or copy this URL into your browser:<br>
              <span style="color: #58a6ff; word-break: break-all;">${verifyUrl}</span>
            </p>
          </div>
        </body>
      </html>
    `,
  });
}
