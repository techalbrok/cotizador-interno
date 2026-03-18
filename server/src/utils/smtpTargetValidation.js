import dns from 'node:dns/promises';
import net from 'node:net';

export const ALLOWED_SMTP_PORTS = [25, 465, 587, 2525];

const blockedHostnames = new Set(['localhost', 'localhost.localdomain']);

const isPrivateIpv4 = (address) => {
  const octets = address.split('.').map((segment) => Number.parseInt(segment, 10));
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;

  return (
    first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
  );
};

const isPrivateIpv6 = (address) => {
  const normalizedAddress = address.toLowerCase();

  if (normalizedAddress === '::' || normalizedAddress === '::1') {
    return true;
  }

  if (normalizedAddress.startsWith('::ffff:')) {
    return isPrivateIpv4(normalizedAddress.slice(7));
  }

  return (
    normalizedAddress.startsWith('fc')
    || normalizedAddress.startsWith('fd')
    || normalizedAddress.startsWith('fe8')
    || normalizedAddress.startsWith('fe9')
    || normalizedAddress.startsWith('fea')
    || normalizedAddress.startsWith('feb')
  );
};

const isPrivateAddress = (address) => {
  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }

  return true;
};

const isBlockedHostname = (host) => (
  blockedHostnames.has(host)
  || host.endsWith('.localhost')
  || host.endsWith('.local')
  || host.endsWith('.internal')
);

export const validateSmtpTarget = async ({ host, port }) => {
  if (!host) {
    return;
  }

  const normalizedHost = String(host).trim().toLowerCase();

  if (!normalizedHost) {
    return;
  }

  const normalizedPort = Number(port);

  if (!ALLOWED_SMTP_PORTS.includes(normalizedPort)) {
    throw new Error(`El puerto SMTP debe ser uno de estos valores: ${ALLOWED_SMTP_PORTS.join(', ')}`);
  }

  if (net.isIP(normalizedHost)) {
    throw new Error('El host SMTP debe ser un dominio valido, no una direccion IP');
  }

  if (!/^[a-z0-9.-]+$/i.test(normalizedHost) || normalizedHost.includes('..') || isBlockedHostname(normalizedHost)) {
    throw new Error('El host SMTP no es valido');
  }

  let records;
  try {
    records = await dns.lookup(normalizedHost, { all: true, verbatim: true });
  } catch {
    throw new Error('No se pudo resolver el host SMTP indicado');
  }

  if (!records.length) {
    throw new Error('No se pudo resolver el host SMTP indicado');
  }

  const blockedAddress = records.find((record) => isPrivateAddress(record.address));
  if (blockedAddress) {
    throw new Error('El host SMTP no puede resolver a direcciones privadas o locales');
  }
};
