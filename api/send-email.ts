import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // CORS HTTP headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text, smtpConfig } = req.body || {};

  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing required fields: to, subject' });
  }

  try {
    // Use client-provided config or fallback to env variables
    const host = smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(smtpConfig?.port || process.env.SMTP_PORT || '587', 10);
    const secure = smtpConfig?.secure !== undefined ? smtpConfig.secure : (process.env.SMTP_SECURE === 'true');
    const user = smtpConfig?.user || process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = smtpConfig?.pass || process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const from = smtpConfig?.from || smtpConfig?.user || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;

    if (!user || !pass) {
      return res.status(500).json({ error: 'SMTP credentials are not configured.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message || String(error) });
  }
}
