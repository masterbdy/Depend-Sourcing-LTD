/**
 * Backend Email Service integration.
 * Makes a POST request to our Custom Node.js Express server.
 */

export const sendOTPEmail = async (email: string, otpCode: string, name: string) => {
  const subject = 'Password Reset OTP - Depend Sourcing Ltd';
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
      <h2 style="color: #ea580c; text-align: center;">Password Reset Request</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Use the following OTP code to verify your identity:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otpCode}</span>
      </div>
      <p style="color: #ef4444; font-size: 14px;"><strong>Note:</strong> This code is valid for 5 minutes. Do not share this code with anyone.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <br>
      <p>Visit app:- <a href="https://depend-sourcing-ltd.vercel.app">depend-sourcing-ltd.vercel.app</a></p>
    </div>
  `;

  const getSmtpConfig = () => {
    try {
      const saved = localStorage.getItem('smtp_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        html,
        smtpConfig: getSmtpConfig()
      }),
    });
    
    if (!response.ok) {
        throw new Error('Failed to send OTP over SMTP');
    }
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Failed to send OTP email via API (fallback to UI console)', error);
    throw error;
  }
};

/**
 * Sends an email notification to the MD when funds are added.
 */
export const sendFundAddedEmailToMD = async (amount: number, source: string, addedBy: string, mdEmail: string = 'dependsource@gmail.com') => {
  const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  const subject = 'Company Fund Added';
  const html = `
    <h3>Company Fund Added</h3>
    <p><strong>Amount:</strong> ${amount} ৳</p>
    <p><strong>Source:</strong> ${source}</p>
    <p><strong>Added By:</strong> ${addedBy}</p>
    <p><strong>Date:</strong> ${date}</p>
    <br>
    <p>Visit app:- <a href="https://depend-sourcing-ltd.vercel.app">depend-sourcing-ltd.vercel.app</a></p>
  `;

  const getSmtpConfig = () => {
    try {
      const config = localStorage.getItem('smtp_config');
      return config ? JSON.parse(config) : undefined;
    } catch {
      return undefined;
    }
  };

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: mdEmail, subject, html, smtpConfig: getSmtpConfig() }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log('Fund added email sent to MD successfully');
  } catch (error) {
    console.warn('[Email Simulation fallback] Failed to send email to MD. Make sure SMTP variables are set in .env.', error);
    console.log(`[Email Simulation] To MD:`, mdEmail, `Fund Added: ${amount} ৳ via ${source} by ${addedBy}`);
  }
};

/**
 * Sends an email notification to the staff when a bill changes status (e.g., Verified, Approved, Rejected).
 */
export const sendBillStatusEmailToStaff = async (staffEmail: string, staffName: string, amount: number, purpose: string, status: string, notes: string = '') => {
  if (!staffEmail) return;

  const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
  const subject = `Bill Status Update: ${status}`;
  const html = `
    <h3>Hello ${staffName},</h3>
    <p>Your bill status has been updated.</p>
    <p><strong>Purpose:</strong> ${purpose}</p>
    <p><strong>Amount:</strong> ${amount} ৳</p>
    <p><strong>Status:</strong> <span style="font-weight: bold; color: ${status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange'}">${status}</span></p>
    <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
    <p><strong>Date:</strong> ${date}</p>
    <br>
    <p>Visit app:- <a href="https://depend-sourcing-ltd.vercel.app">depend-sourcing-ltd.vercel.app</a></p>
  `;

  const getSmtpConfig = () => {
    try {
      const config = localStorage.getItem('smtp_config');
      return config ? JSON.parse(config) : undefined;
    } catch {
      return undefined;
    }
  };

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: staffEmail, subject, html, smtpConfig: getSmtpConfig() }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log('Bill status email sent to staff successfully');
  } catch (error) {
    console.warn('[Email Simulation fallback] Failed to send email to Staff. Make sure SMTP variables are set in .env.', error);
    console.log(`[Email Simulation] To Staff:`, staffEmail, `Bill Status Update: ${purpose} (${amount} ৳) is now ${status}. Notes: ${notes}`);
  }
};

