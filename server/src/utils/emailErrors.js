export const getEmailDeliveryErrorMessage = (error) => {
  const rawMessage = error instanceof Error ? error.message : '';
  const normalizedMessage = rawMessage.toLowerCase();
  const errorCode = typeof error === 'object' && error && 'code' in error ? String(error.code).toLowerCase() : '';

  if (normalizedMessage.includes('wrong version number')) {
    return 'No se pudo conectar con el SMTP. Revisa la combinacion de puerto y TLS.';
  }

  if (normalizedMessage.includes('greeting never received')) {
    return 'El servidor SMTP no respondio al saludo inicial. Revisa la combinacion de puerto y TLS.';
  }

  if (normalizedMessage.includes('invalid login') || normalizedMessage.includes('incorrect authentication data') || normalizedMessage.includes('authentication')) {
    return 'No se pudo autenticar el SMTP. Revisa usuario y contrasena.';
  }

  if (
    normalizedMessage.includes('econnrefused')
    || normalizedMessage.includes('enotfound')
    || normalizedMessage.includes('etimedout')
    || errorCode === 'econnrefused'
    || errorCode === 'enotfound'
    || errorCode === 'etimedout'
  ) {
    return 'No se pudo conectar con el servidor SMTP. Revisa host, puerto y conectividad.';
  }

  return 'No se pudo validar la configuracion SMTP. Revisa los datos del perfil.';
};
