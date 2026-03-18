import { getDelegacionById } from '../models/delegacionModel.js';
import { getAdjuntosBySolicitud } from '../models/adjuntoModel.js';
import { resolveStoredUploadPath } from '../utils/uploadStorage.js';
import { resolveSolicitudRecipientsForUser, resolveSmtpTransportForUser } from './userSmtpService.js';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const enviarEmailCandeleda = async (solicitud, usuario) => {
  try {
    const candeleda = await getDelegacionById(2);
    if (!candeleda) throw new Error('Delegacion Candeleda no encontrada');

    const adjuntos = await getAdjuntosBySolicitud(solicitud.id);

    const asunto = `[Albroksa] Nueva solicitud - ${solicitud.ramo} - ${solicitud.datos_formulario.nombre_cliente || 'Cliente'} - Ref: ${solicitud.referencia}`;

    let datosHtml = '';
    for (const [key, value] of Object.entries(solicitud.datos_formulario)) {
      datosHtml += `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>${escapeHtml(key)}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(value)}</td></tr>`;
    }

    const adjuntosHtml = adjuntos.length > 0
      ? `<ul>${adjuntos.map((adjunto) => `<li>${escapeHtml(adjunto.nombre_original)}</li>`).join('')}</ul>`
      : '<p>No se han enviado adjuntos.</p>';

    const html = `
      <h2>Nueva Solicitud de Cotizacion</h2>
      <p><strong>Referencia:</strong> ${escapeHtml(solicitud.referencia)}</p>
      <p><strong>Ramo:</strong> ${escapeHtml(solicitud.ramo)}</p>
      <p><strong>Enviado por:</strong> ${escapeHtml(usuario.nombre || solicitud.creador_nombre || 'Usuario interno')} (${escapeHtml(solicitud.delegacion_nombre)})</p>

      <h3>Datos del Formulario</h3>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        ${datosHtml}
      </table>

      <h3>Observaciones</h3>
      <p>${escapeHtml(solicitud.observaciones || 'Sin observaciones')}</p>

      <h3>Adjuntos</h3>
      ${adjuntosHtml}
    `;

    const attachments = adjuntos.map((adjunto) => ({
      filename: adjunto.nombre_original,
      path: resolveStoredUploadPath(adjunto.ruta_servidor),
    }));

    const { transporter, from } = await resolveSmtpTransportForUser(usuario.id);
    const to = await resolveSolicitudRecipientsForUser(usuario.id, candeleda.email_contacto);

    await transporter.sendMail({
      from,
      to,
      subject: asunto,
      html,
      attachments,
    });

    console.log(`Email enviado a Candeleda para la solicitud ${solicitud.referencia}`);
  } catch (error) {
    console.error('Error enviando email a Candeleda:', error);
    throw error;
  }
};
