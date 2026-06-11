import defaultTransporter, { createSmtpTransport, defaultMailFrom } from '../config/email.js';
import { findUserSmtpSettingsById } from '../models/userModel.js';
import { decryptText, encryptText } from '../utils/crypto.js';
import { ALLOWED_SMTP_PORTS, validateSmtpTarget } from '../utils/smtpTargetValidation.js';

const buildFromValue = (email, name) => {
  if (!email) {
    return defaultMailFrom.name ? `${defaultMailFrom.name} <${defaultMailFrom.email}>` : defaultMailFrom.email;
  }

  return name ? `${name} <${email}>` : email;
};

const normalizeOptional = (value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeRecipientEmails = (value) => {
  const normalizedValue = normalizeOptional(value);
  if (!normalizedValue) {
    return null;
  }

  const recipients = normalizedValue
    .split(/[\n,;]+/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return null;
  }

  const invalidRecipient = recipients.find((recipient) => !emailPattern.test(recipient));
  if (invalidRecipient) {
    throw new Error(`El destinatario ${invalidRecipient} no es un email valido`);
  }

  return Array.from(new Set(recipients)).join(', ');
};

export const getUserSmtpSettingsForProfile = async (userId) => {
  const settings = await findUserSmtpSettingsById(userId);

  return {
    smtp_enabled: Boolean(settings?.smtp_enabled),
    smtp_host: settings?.smtp_host || '',
    smtp_port: settings?.smtp_port || 587,
    smtp_secure: Boolean(settings?.smtp_secure),
    smtp_user: settings?.smtp_user || '',
    smtp_from_name: settings?.smtp_from_name || '',
    smtp_from_email: settings?.smtp_from_email || '',
    smtp_password_configured: Boolean(settings?.smtp_pass_encrypted),
    solicitud_destinatarios_email: settings?.solicitud_destinatarios_email || '',
  };
};

export const normalizeUserSmtpPayload = (payload) => {
  const smtp_enabled = Boolean(payload.smtp_enabled);
  const smtp_host = normalizeOptional(payload.smtp_host);
  const smtp_port = Number(payload.smtp_port);
  const smtp_secure = Boolean(payload.smtp_secure);
  const smtp_user = normalizeOptional(payload.smtp_user);
  const smtp_from_name = normalizeOptional(payload.smtp_from_name);
  const smtp_from_email = normalizeOptional(payload.smtp_from_email);
  const smtp_password = normalizeOptional(payload.smtp_password);
  const solicitud_destinatarios_email = normalizeRecipientEmails(payload.solicitud_destinatarios_email);

  if (!Number.isInteger(smtp_port) || !ALLOWED_SMTP_PORTS.includes(smtp_port)) {
    throw new Error(`El puerto SMTP debe ser uno de estos valores: ${ALLOWED_SMTP_PORTS.join(', ')}`);
  }

  if (smtp_port === 465 && !smtp_secure) {
    throw new Error('El puerto 465 requiere TLS activado. Marca "Usar TLS/STARTTLS".');
  }

  if (smtp_enabled && (!smtp_host || !smtp_user)) {
    throw new Error('Debes indicar host, puerto y usuario SMTP para activar el envio con tu cuenta');
  }

  return {
    smtp_enabled,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_user,
    smtp_from_name,
    smtp_from_email,
    smtp_password,
    solicitud_destinatarios_email,
  };
};

export const toPersistedUserSmtpSettings = (currentSettings, payload) => {
  const nextPassword = payload.smtp_password
    ? encryptText(payload.smtp_password)
    : currentSettings?.smtp_pass_encrypted
      ? encryptText(decryptText(currentSettings.smtp_pass_encrypted))
      : null;

  if (payload.smtp_enabled && !nextPassword) {
    throw new Error('Debes guardar una contrasena SMTP antes de activar el envio con tu cuenta');
  }

  return {
    smtp_enabled: payload.smtp_enabled,
    smtp_host: payload.smtp_host,
    smtp_port: payload.smtp_port,
    smtp_secure: payload.smtp_secure,
    smtp_user: payload.smtp_user,
    smtp_pass_encrypted: nextPassword,
    smtp_from_name: payload.smtp_from_name,
    smtp_from_email: payload.smtp_from_email,
    solicitud_destinatarios_email: payload.solicitud_destinatarios_email,
  };
};

export const assertSafeUserSmtpSettings = async (settings) => {
  if (!settings?.smtp_host) {
    return;
  }

  await validateSmtpTarget({ host: settings.smtp_host, port: settings.smtp_port });
};

const resolveCustomTransport = async (settings, missingSettingsMessage = 'La configuracion SMTP personal esta incompleta') => {
  if (!settings.smtp_host || !settings.smtp_port || !settings.smtp_user || !settings.smtp_pass_encrypted) {
    throw new Error(missingSettingsMessage);
  }

  await assertSafeUserSmtpSettings(settings);

  const decryptedPassword = decryptText(settings.smtp_pass_encrypted);
  const transporter = createSmtpTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: Boolean(settings.smtp_secure),
    user: settings.smtp_user,
    pass: decryptedPassword,
    fromEmail: settings.smtp_from_email || settings.smtp_user,
  });

  return {
    transporter,
    from: buildFromValue(settings.smtp_from_email || settings.smtp_user, settings.smtp_from_name),
    isCustom: true,
  };
};

export const resolveSolicitudRecipientsForUser = async (userId, fallbackRecipients) => {
  const settings = await findUserSmtpSettingsById(userId);

  if (settings?.solicitud_destinatarios_email) {
    return settings.solicitud_destinatarios_email;
  }

  return fallbackRecipients;
};

export const resolveSmtpTransportForUser = async (userId) => {
  const settings = await findUserSmtpSettingsById(userId);

  if (!settings?.smtp_enabled) {
    return {
      transporter: defaultTransporter,
      from: buildFromValue(defaultMailFrom.email, defaultMailFrom.name),
      isCustom: false,
    };
  }

  return resolveCustomTransport(settings, 'La configuracion SMTP personal esta incompleta');
};

export const verifyUserSmtpConfiguration = async (currentSettings, payload) => {
  const normalizedPayload = normalizeUserSmtpPayload(payload);
  const effectiveSettings = toPersistedUserSmtpSettings(currentSettings, normalizedPayload);
  const { transporter, from } = await resolveCustomTransport(
    effectiveSettings,
    'Debes completar host, puerto, usuario y contrasena SMTP para probar la conexion'
  );

  await transporter.verify();

  return {
    from,
    host: effectiveSettings.smtp_host,
    port: effectiveSettings.smtp_port,
    secure: Boolean(effectiveSettings.smtp_secure),
  };
};
