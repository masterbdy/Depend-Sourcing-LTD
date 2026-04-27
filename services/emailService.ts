/**
 * Backend Email Service integration.
 * Makes a POST request to our Custom Node.js Express server.
 */

export const initEmailJs = () => {
  // Kept for backwards compatibility if needed, but not used anymore.
};

/**
 * Sends an email notification to the MD when funds are added.
 */
export const sendFundAddedEmailToMD = async (amount: number, source: string, addedBy: string, mdEmail: string = 'md@mdabidhasan.com') => {
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

