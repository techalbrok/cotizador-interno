export const ensureSolicitudAccess = (user, solicitud, message = 'No tienes permiso para acceder a esta solicitud') => {
  if (user.rol === 'operador' && solicitud.delegacion_origen_id !== user.delegacion_id) {
    const error = new Error(message);
    error.statusCode = 403;
    throw error;
  }
};

export const ensureSolicitudOwnership = (user, solicitud, message = 'Solo el creador puede modificar la solicitud') => {
  if (user.rol === 'operador' && solicitud.creado_por !== user.id) {
    const error = new Error(message);
    error.statusCode = 403;
    throw error;
  }
};
