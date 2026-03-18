import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getJwtSecret } from '../config/secrets.js';
import { getAuthCookieName, parseCookies } from '../utils/authCookies.js';

dotenv.config();

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[getAuthCookieName()];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const candidateTokens = [bearerToken, cookieToken].filter(Boolean);

  if (candidateTokens.length === 0) {
    return res.status(401).json({ message: 'No token provided or invalid format' });
  }

  const jwtSecret = getJwtSecret();

  for (const token of candidateTokens) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded; // { id, rol, delegacion_id }
      return next();
    } catch (error) {
      continue;
    }
  }

  return res.status(401).json({ message: 'Invalid or expired token' });
};

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
