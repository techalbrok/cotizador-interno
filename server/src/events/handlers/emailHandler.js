import { eventBus, EVENTS } from '../eventBus.js';
import { notificationQueue } from '../notificationQueue.js';
import { enviarEmailCambioEstado } from '../../services/emailService.js';

const handleSolicitudEnviada = (payload) => {
  return notificationQueue.enqueue('email.solicitudEnviada', async () => {
    const result = await enviarEmailCambioEstado({
      solicitud: payload.solicitud,
      usuario: payload.usuario,
      estadoAnterior: 'Borrador',
      estadoNuevo: 'Enviada',
      observacion: payload.observacion,
    });
    console.log(`[emailHandler] Email de solicitud enviada despachado: ${result?.subject} -> ${result?.to}`);
    return result;
  });
};

const handleEstadoCambiado = (payload) => {
  if (payload.estadoNuevo === 'Enviada' || payload.estadoAnterior === 'Borrador') {
    return;
  }
  return notificationQueue.enqueue(`email.estadoCambiado:${payload.estadoNuevo}`, async () => {
    const result = await enviarEmailCambioEstado({
      solicitud: payload.solicitud,
      usuario: payload.usuario,
      estadoAnterior: payload.estadoAnterior,
      estadoNuevo: payload.estadoNuevo,
      observacion: payload.observacion,
    });
    if (result) {
      console.log(`[emailHandler] Email ${payload.estadoAnterior} -> ${payload.estadoNuevo}: ${result.subject} -> ${result.to}`);
    }
    return result;
  });
};

let registered = false;

export const registerEmailHandlers = () => {
  if (registered) {
    return;
  }
  eventBus.on(EVENTS.SOLICITUD_ENVIADA, handleSolicitudEnviada);
  eventBus.on(EVENTS.SOLICITUD_ESTADO_CAMBIADO, handleEstadoCambiado);
  registered = true;
  console.log('[emailHandler] Suscripciones registradas');
};
