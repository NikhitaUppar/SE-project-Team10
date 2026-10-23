const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpHost === 'smtp.gmail.com' && smtpPort !== 465,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: smtpHost === 'smtp.gmail.com' ? (process.env.SMTP_PASS || '').replace(/\s/g, '') : process.env.SMTP_PASS,
  } : undefined,
});

const sendSignupCode = async (email, code) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
    to: email,
    subject: 'Your MicroDonate verification code',
    text: `Your verification code is: ${code}\nEnter this code on the signup page. It expires in 5 minutes. If you did not request it, ignore this email.`,
    html: `<p>Your verification code is:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p><p>Enter it on the signup page. It expires in 5 minutes.</p><p>If you did not request it, ignore this email.</p>`,
  });
  if (!info?.accepted?.length || info.rejected?.length) throw new Error('Signup email not accepted');
  return info;
};

const sendVerificationEmail = async (email, token) => {
  const url = new URL('/verify-email', process.env.CLIENT_URL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid frontend URL');
  // The fragment is not sent to the frontend web server or in Referer headers.
  url.hash = new URLSearchParams({ token }).toString();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
    to: email,
    subject: 'Verify your email — Micro Donation Platform',
    text: `Verify your email: ${url.href}\nThis link expires in 24 hours and can only be used once. If you did not create this account, ignore this email.`,
    html: `<p>Click <a href="${url.href}">here</a> to verify your email. This link expires in 24 hours and can only be used once.</p><p>If you did not create this account, ignore this email.</p>`,
  });
  if (!info?.accepted?.length || info.rejected?.length) throw new Error('Verification email not accepted');
  return info;
};

const sendPasswordResetEmail = async (email, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
    to: email,
    subject: 'Reset your password — Micro Donation Platform',
    html: `<p>Click <a href="${url}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  });
};

const sendReceiptEmail = async (
  email,
  {
    donorName = 'Supporter',
    amount = 0,
    campaignName = 'Micro Donation Cause',
    date = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    transactionId = 'N/A',
    receiptNumber = null,
    paymentStatus = 'Completed',
  } = {}
) => {
  // 1. Validation for missing or invalid email address (FR-13, NFR-09)
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.warn('[EmailController] Notice: Skipping receipt email - invalid or missing email address:', email);
    return { success: false, reason: 'Invalid or missing email address' };
  }

  const receiptRef = receiptNumber || `RCPT-${String(transactionId).replace(/^pay_/, '')}`;
  const formattedAmount = `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const emailSubject = `Donation Receipt: ${campaignName} [${receiptRef}]`;

  // 2. Responsive, clean desktop and mobile HTML email template
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #4338ca; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Micro-Donation Platform</h1>
              <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 14px; font-weight: 500;">Official Donation Receipt</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                  ✓ Payment ${paymentStatus}
                </span>
              </div>

              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #111827;">Thank you, ${donorName}!</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Your generous contribution makes a meaningful difference. Below are the verified details of your donation transaction.
              </p>

              <!-- Transaction Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Campaign</span>
                    <div style="font-size: 15px; font-weight: 600; color: #111827; margin-top: 3px;">${campaignName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Amount Donated</span>
                    <div style="font-size: 20px; font-weight: 700; color: #4338ca; margin-top: 3px;">${formattedAmount}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Receipt / Reference No.</span>
                    <div style="font-size: 13px; font-family: monospace; font-weight: 600; color: #374151; margin-top: 3px;">${receiptRef}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Transaction / Payment ID</span>
                    <div style="font-size: 13px; font-family: monospace; font-weight: 600; color: #374151; margin-top: 3px;">${transactionId}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px;">
                    <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Date & Time</span>
                    <div style="font-size: 13px; font-weight: 500; color: #374151; margin-top: 3px;">${date}</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                Please retain this receipt for your records. For inquiries regarding this contribution, quote your reference number above.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Micro-Donation Platform. All rights reserved.
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">
                This is an automated receipt notification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // 3. Plain text fallback
  const textContent = `
DONATION RECEIPT — MICRO-DONATION PLATFORM
==================================================
Payment Status: ${paymentStatus}
Thank you, ${donorName}!

Campaign: ${campaignName}
Amount: ${formattedAmount}
Receipt Reference: ${receiptRef}
Transaction ID: ${transactionId}
Date: ${date}

Thank you for your generous contribution.
==================================================
  `.trim();

  // Test mode fallback when not running with live SMTP
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_LIVE_SMTP) {
    return { success: true, messageId: 'test-mock-sent' };
  }

  // 4. Send email safely with error isolation (failure does not throw or corrupt payment status)
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@microdonation.dev',
      to: email,
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
    });
    return { success: true, messageId: info?.messageId || 'sent' };
  } catch (error) {
    console.warn('[EmailController] Notice: Email sending failure (non-fatal):', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  sendSignupCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendReceiptEmail,
};
