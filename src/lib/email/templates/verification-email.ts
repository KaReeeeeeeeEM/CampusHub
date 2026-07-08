type VerificationEmailInput = {
  userName?: string | null;
  verificationUrl: string;
  logoUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderVerificationEmail({
  userName,
  verificationUrl,
  logoUrl,
}: VerificationEmailInput) {
  const safeName = userName?.trim() ? escapeHtml(userName.trim()) : "there";
  const safeUrl = escapeHtml(verificationUrl);
  const safeLogoUrl = escapeHtml(logoUrl);

  const text = [
    `Hi ${userName?.trim() || "there"},`,
    "",
    "Welcome to CampusHub. Please verify your email address to activate your account.",
    "",
    `Verify your email: ${verificationUrl}`,
    "",
    "This link expires in 24 hours. If you did not request this email, you can ignore it.",
    "",
    "CampusHub",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your CampusHub email</title>
  </head>
  <body style="margin:0;background:#f4f6fb;font-family:Inter,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 48px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#080b1a;padding:32px;text-align:center;">
                <img src="${safeLogoUrl}" width="72" height="72" alt="CampusHub" style="display:inline-block;border-radius:18px;" />
                <h1 style="margin:18px 0 0;font-size:30px;line-height:1.15;color:#ffffff;font-weight:800;letter-spacing:-0.02em;">Verify your CampusHub email</h1>
                <p style="margin:12px 0 0;color:#c7d2fe;font-size:15px;line-height:1.6;">Secure your account and continue into your campus workspace.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 12px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">Hi ${safeName},</p>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;">Welcome to CampusHub. Please confirm that this Gmail address belongs to you so we can activate your account and protect your campus access.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:26px 32px 12px;">
                <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 26px;border-radius:14px;">Verify email address</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 34px;">
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;color:#4f46e5;">${safeUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:22px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">This verification link expires in 24 hours. If you did not request this email, you can safely ignore it.</p>
                <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#9ca3af;">CampusHub account security</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}
