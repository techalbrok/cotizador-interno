const MIN_SECRET_LENGTH = 32;

const forbiddenSecrets = {
  JWT_SECRET: [
    'super_secret_jwt_key_change_in_production',
    'REEMPLAZA_CON_UN_SECRETO_LARGO_Y_ALEATORIO_DE_AL_MENOS_32_CARACTERES',
  ],
  APP_ENCRYPTION_KEY: [
    'change_this_encryption_secret',
    'define_una_clave_larga_y_distinta_para_cifrado',
    'REEMPLAZA_CON_OTRO_SECRETO_DISTINTO_DE_JWT_SECRET_Y_DE_AL_MENOS_32_CARACTERES',
  ],
};

const readRequiredSecret = (name) => {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} es obligatorio y no puede estar vacio`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }

  const invalidExamples = forbiddenSecrets[name] || [];
  if (invalidExamples.includes(normalizedValue)) {
    throw new Error(`${name} no puede usar el valor de ejemplo por defecto`);
  }

  return normalizedValue;
};

export const getJwtSecret = () => readRequiredSecret('JWT_SECRET');

export const getAppEncryptionKey = () => readRequiredSecret('APP_ENCRYPTION_KEY');

export const getLegacyEncryptionSecrets = () => {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const encryptionSecret = process.env.APP_ENCRYPTION_KEY?.trim();
  const explicitLegacySecret = process.env.LEGACY_APP_ENCRYPTION_KEY?.trim();
  const legacySecrets = new Set();

  if (explicitLegacySecret) {
    legacySecrets.add(explicitLegacySecret);
  }

  if (jwtSecret && encryptionSecret && jwtSecret !== encryptionSecret) {
    legacySecrets.add(jwtSecret);
  }

  return Array.from(legacySecrets);
};

export const validateSecurityConfiguration = () => {
  const jwtSecret = getJwtSecret();
  const encryptionSecret = getAppEncryptionKey();

  if (jwtSecret === encryptionSecret) {
    throw new Error('APP_ENCRYPTION_KEY debe ser distinta de JWT_SECRET');
  }
};
