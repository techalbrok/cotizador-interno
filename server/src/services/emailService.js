import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { getDelegacionById } from '../models/delegacionModel.js';
import { getAdjuntosBySolicitud } from '../models/adjuntoModel.js';
import { resolveStoredUploadPath } from '../utils/uploadStorage.js';
import { resolveSolicitudRecipientsForUser, resolveSmtpTransportForUser } from './userSmtpService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'emails');

const templateCache = new Map();

const loadTemplate = (name) => {
  if (templateCache.has(name)) {
    return templateCache.get(name);
  }

  const baseSource = fs.readFileSync(path.join(TEMPLATES_DIR, 'base.hbs'), 'utf8');
  const bodySource = fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.json`), 'utf8');

  const compiled = Handlebars.compile(baseSource, { noEscape: true });
  templateCache.set(name, { compiled, body: JSON.parse(bodySource) });
  return templateCache.get(name);
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const APP_URL = process.env.APP_URL || '';

const renderEmail = (templateName, context) => {
  const { compiled, body } = loadTemplate(templateName);

  const fields = body.fields.map((row) => ({
    label: row.label,
    value: `{{${row.value.replace(/[{}]/g, '')}}}`,
  }));

  const merged = {
    ...body,
    ...context,
    fields,
  };

  const html = compiled(merged);
  const subject = `[Albroksa] ${body.title} - ${context.solicitud?.referencia || ''}`.trim();
  return { html, subject };
};

const buildContext = async (solicitud, usuario) => {
  const clienteNombre = solicitud.datos_formulario?.nombre_cliente
    || solicitud.datos_formulario?.tomador
    || 'Cliente';

  const adjuntos = await getAdjuntosBySolicitud(solicitud.id);
  const observaciones = solicitud.observaciones || '';

  return {
    solicitud,
    usuario,
    clienteNombre,
    destinatarioNombre: usuario?.nombre || 'equipo',
    observaciones,
    adjuntos,
    ctaUrl: APP_URL ? `${APP_URL}/request/${solicitud.id}` : '',
    ctaLabel: 'Abrir solicitud',
  };
};

export const enviarEmailCambioEstado = async ({ solicitud, usuario, estadoNuevo, estadoAnterior, observacion }) => {
  let templateName;
  if (estadoNuevo === 'Enviada' || (estadoAnterior === 'Borrador' && estadoNuevo === 'Enviada')) {
    templateName = 'solicitud-enviada';
  } else if (estadoNuevo === 'Respondida') {
    templateName = 'solicitud-respondida';
  } else if (estadoNuevo === 'Emitida') {
    templateName = 'solicitud-emitida';
  } else if (estadoNuevo === 'Cancelada') {
    templateName = 'solicitud-cancelada';
  } else {
    return null;
  }

  const candeleda = await getDelegacionById(2);
  const context = await buildContext(solicitud, usuario);
  context.observaciones = observacion || context.observaciones;

  const { html, subject } = renderEmail(templateName, context);

  const attachments = (context.adjuntos || []).map((adjunto) => ({
    filename: adjunto.nombre_original,
    path: resolveStoredUploadPath(adjunto.ruta_servidor),
  }));

  const { transporter, from } = await resolveSmtpTransportForUser(usuario?.id);
  const fallbackRecipients = candeleda ? candeleda.email_contacto : '';
  const to = await resolveSolicitudRecipientsForUser(usuario?.id, fallbackRecipients);

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
  });

  return { subject, to };
};

export const enviarEmailCandeleda = async (solicitud, usuario) => {
  return enviarEmailCambioEstado({
    solicitud,
    usuario,
    estadoAnterior: 'Borrador',
    estadoNuevo: 'Enviada',
    observacion: solicitud.observaciones,
  });
};

export { escapeHtml };
