const nodemailer = require('nodemailer');

const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    COMPANY_LOGO_URL,
    APP_BASE_URL,
    APP_NAME
} = process.env;

let cachedTransporter = null;

const emailEnabled = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const getTransporter = () => {
    if (!emailEnabled()) {
        return null;
    }
    if (cachedTransporter) {
        return cachedTransporter;
    }
    cachedTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: String(SMTP_SECURE).toLowerCase() === 'true' || Number(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });
    return cachedTransporter;
};

const defaultLogoSvg = `
<svg width="132" height="132" viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" fill-rule="evenodd">
    <circle cx="66" cy="66" r="66" fill="#0f4fa2"/>
    <path d="M45 101l42-10-4-58c-0.4-5.5-5.1-9.7-10.6-9.3l-17.8 1.3c-5 .4-8.9 4.6-8.9 9.6V101z" fill="#f8f9ff"/>
    <path d="M39 100h54c3.9 0 7 3.1 7 7v6H32v-6c0-3.9 3.1-7 7-7z" fill="#14b8a6"/>
    <path d="M55 33l-9 1.2c-2.8.4-4.9 2.8-4.9 5.7V101h14V33z" fill="#b1c5ff" opacity=".65"/>
    <path d="M39 111h54v8H39z" fill="#0ea5e9"/>
  </g>
</svg>
`;
const DEFAULT_LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(defaultLogoSvg).toString('base64')}`;

const getBaseUrl = () => APP_BASE_URL || 'http://localhost:3000';
const getAppName = () => APP_NAME || 'ApexLearn';
const getLogoSource = () => COMPANY_LOGO_URL || DEFAULT_LOGO_DATA_URI;

const sendMail = async (options) => {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('Email transport not configured, skipping email send for', options?.to);
        return null;
    }
    const mailOptions = {
        from: EMAIL_FROM || `${getAppName()} <${SMTP_USER}>`,
        ...options
    };
    return transporter.sendMail(mailOptions);
};

const buildWelcomeTemplate = (name = 'there') => {
    const safeName = name.trim().length ? name.trim() : 'there';
    const dashboardUrl = `${getBaseUrl()}/login`;
    const logoSrc = getLogoSource();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Welcome to ${getAppName()}</title>
  <style>
    body { margin:0; font-family:'Nunito',Arial,sans-serif; background:#f4f7fb; color:#0f172a; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.12);">
          <tr>
            <td align="center" style="background:#0f4fa2;padding:36px 24px;">
              <img src="${logoSrc}" alt="${getAppName()} logo" height="96" style="display:block;margin:0 auto 18px;border:none;" />
              <h1 style="margin:0;font-size:28px;color:#ffffff;">Welcome to ${getAppName()}</h1>
              <p style="margin:10px 0 0;color:#cfd9ff;font-size:16px;letter-spacing:0.5px;">Adaptive learning begins now</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 42px;">
              <p style="font-size:18px;margin:0 0 18px;">Hi ${safeName},</p>
              <p style="line-height:1.6;margin:0 0 16px;">
                We&rsquo;re thrilled to have you with us. Your ${getAppName()} dashboard is set up with
                your streak tracker, FSLSM learning assessment, and our ApexLearn ChatBot powered by Gemini.
              </p>
              <p style="line-height:1.6;margin:0 0 16px;">Here&rsquo;s how to get started:</p>
              <ol style="padding-left:20px;line-height:1.7;color:#475569;margin:0 0 18px;">
                <li>Complete the &ldquo;Learn Your Style&rdquo; quiz.</li>
                <li>Enroll in a course and watch your streak grow.</li>
                <li>Tap the AI Tutor to ask anything and receive tailored support.</li>
              </ol>
              <p style="line-height:1.6;margin:0 0 24px;">
                Need help? Reply to this email or open the Help Center from your sidebar.
              </p>
              <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(120deg,#14b8a6,#0ea5e9);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:999px;font-weight:600;">Open my dashboard</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#f1f5f9;padding:22px 32px;color:#64748b;font-size:13px;">
              © ${new Date().getFullYear()} ${getAppName()}. All rights reserved.<br/>
              Built for modern, adaptive learning experiences.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const buildResetTemplate = (name = 'there', link) => {
    const safeName = name.trim().length ? name.trim() : 'there';
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;background:#f9fafb;font-family:'Nunito',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;padding:32px;box-shadow:0 10px 35px rgba(15,23,42,0.08);">
            <tr><td>
              <p style="font-size:18px;margin:0 0 18px;">Hi ${safeName},</p>
              <p style="line-height:1.6;margin:0 0 18px;">We received a request to reset your ${getAppName()} password.</p>
              <p style="line-height:1.6;margin:0 0 24px;">Click the secure button below; the link expires in one hour.</p>
              <p style="margin:0 0 24px;">
                <a href="${link}" style="background:#0ea5e9;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset password</a>
              </p>
              <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">If you didn&rsquo;t request this, you can safely ignore the email.</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

const sendWelcomeEmail = async ({ name, email }) => {
    if (!email) return null;
    return sendMail({
        to: email,
        subject: `Welcome to ${getAppName()}`,
        html: buildWelcomeTemplate(name)
    });
};

const sendPasswordResetEmail = async ({ name, email, resetLink }) => {
    if (!email || !resetLink) return null;
    return sendMail({
        to: email,
        subject: `${getAppName()} password reset`,
        html: buildResetTemplate(name, resetLink)
    });
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    isEmailConfigured: emailEnabled
};
