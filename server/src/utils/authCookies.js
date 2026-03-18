const authCookieName = 'albroksa_auth';
const authCookieMaxAgeMs = 8 * 60 * 60 * 1000;

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: authCookieMaxAgeMs,
  path: '/',
});

export const getAuthCookieName = () => authCookieName;

export const setAuthCookie = (res, token) => {
  res.cookie(authCookieName, token, buildCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
};

export const parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((cookieEntry) => cookieEntry.trim())
    .filter(Boolean)
    .reduce((cookies, cookieEntry) => {
      const separatorIndex = cookieEntry.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = decodeURIComponent(cookieEntry.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(cookieEntry.slice(separatorIndex + 1).trim());

      return { ...cookies, [key]: value };
    }, {});
};
