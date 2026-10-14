const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your email — Micro Donation Platform',
    html: `<p>Click <a href="${url}">here</a> to verify your email. Link expires in 24 hours.</p>`,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your password — Micro Donation Platform',
    html: `<p>Click <a href="${url}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  });
};

const sendReceiptEmail = async (email, { amount, campaignName, date, transactionId }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Donation Receipt — Micro Donation Platform',
    html: `
      <h2>Thank you for your donation!</h2>
      <p><strong>Campaign:</strong> ${campaignName}</p>
      <p><strong>Amount:</strong> ₹${amount}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Transaction ID:</strong> ${transactionId}</p>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendReceiptEmail };
