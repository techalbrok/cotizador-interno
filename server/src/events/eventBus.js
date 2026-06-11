import { EventEmitter } from 'node:events';

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

export const eventBus = new AppEventBus();

export const EVENTS = Object.freeze({
  SOLICITUD_CREADA: 'solicitud.creada',
  SOLICITUD_ENVIADA: 'solicitud.enviada',
  SOLICITUD_ESTADO_CAMBIADO: 'solicitud.estadoCambiado',
  SOLICITUD_COMENTARIO_ANADIDO: 'solicitud.comentarioAnadido',
});

export const emitAsync = (eventName, payload) => {
  setImmediate(() => {
    try {
      eventBus.emit(eventName, payload);
    } catch (error) {
      console.error(`[eventBus] Error en listener de ${eventName}:`, error);
    }
  });
};
