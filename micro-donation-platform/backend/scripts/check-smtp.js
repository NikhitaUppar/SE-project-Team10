require('dotenv').config({ quiet: true });

async function checkSmtp() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  const missing = required.filter(key => !process.env[key]?.trim() || /your[-_]|your-google-app-password/i.test(process.env[key]));
  if (missing.length) {
    console.error(`Email setup incomplete. Fill these values privately in backend/.env: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  try {
    const { transporter } = require('../src/controllers/emailController');
    await transporter.verify();
    console.log('SMTP connection and authentication passed. No email was sent.');
  } catch (error) {
    // Provider errors can contain addresses. Show a diagnosis without dumping them.
    const reason = error.code === 'EAUTH' ? 'Gmail rejected authentication. Check the sender address and Google App Password.'
      : error.code === 'ETIMEDOUT' ? 'The SMTP connection timed out. Check your internet connection and firewall.'
      : 'Unable to connect to SMTP. Check the mail settings and network connection.';
    console.error(reason);
    process.exitCode = 1;
  }
}

checkSmtp();
