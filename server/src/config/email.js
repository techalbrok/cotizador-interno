import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const buildTlsOptions = (port, secure) => {
  if (!secure) {
    return { secure: false };
  }

  // Port 465 uses implicit TLS; port 587/25 typically use STARTTLS after plain connect.
  if (port === 465) {
    return { secure: true };
  }

  return {
    secure: false,
    requireTLS: true,
  };
};

const buildClientName = ({ name, host, user, fromEmail }) => {
  if (name) return name;
  if (process.env.SMTP_CLIENT_NAME) return process.env.SMTP_CLIENT_NAME;

  const candidateEmail = fromEmail || user;
  if (candidateEmail && candidateEmail.includes('@')) {
    return candidateEmail.split('@')[1];
  }

  if (host && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return host;
  }

  const machineName = os.hostname();
  return machineName && machineName !== 'localhost' ? machineName : 'localhost';
};

export const createSmtpTransport = ({ host, port, secure, user, pass, fromEmail, name }) => nodemailer.createTransport({
  host,
  port,
  name: buildClientName({ name, host, user, fromEmail }),
  ...buildTlsOptions(port, secure),
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user,
    pass,
  },
});

export const defaultSmtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.albroksa.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  user: process.env.SMTP_USER || 'no-reply@albroksa.com',
  pass: process.env.SMTP_PASS || 'password',
};

export const defaultMailFrom = {
  email: process.env.SMTP_FROM_EMAIL || defaultSmtpConfig.user,
  name: process.env.SMTP_FROM_NAME || '',
};

const transporter = createSmtpTransport(defaultSmtpConfig);

export default transporter;
