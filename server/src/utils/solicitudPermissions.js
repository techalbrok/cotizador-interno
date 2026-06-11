import pool from '../config/db.js';

const isOperador = (user) => user.rol === 'operador';
const isAvisador = (user) => user.rol === 'avisador';
const isGestor = (user) => user.rol === 'gestor';
const isPrivileged = (user) => user.rol === 'admin' || user.rol === 'superadmin';

let childDelegationCache = new Map();

const invalidateChildDelegationCache = () => {
  childDelegationCache = new Map();
};

export const getChildDelegationIds = async (parentId) => {
  if (!parentId) {
    return [];
  }

  if (childDelegationCache.has(parentId)) {
    return childDelegationCache.get(parentId);
  }

  const [rows] = await pool.query(
    `WITH RECURSIVE delegation_tree AS (
       SELECT id FROM delegaciones WHERE id = ?
       UNION ALL
       SELECT d.id FROM delegaciones d
       INNER JOIN delegation_tree dt ON d.parent_delegacion_id = dt.id
     )
     SELECT id FROM delegation_tree`,
    [parentId]
  );

  const ids = rows.map((row) => row.id);
  childDelegationCache.set(parentId, ids);
  return ids;
};

export const canAccessDelegacion = async (user, delegacionId) => {
  if (isPrivileged(user)) {
    return true;
  }
  if (!delegacionId) {
    return false;
  }
  if (user.delegacion_id === delegacionId) {
    return true;
  }
  if (isGestor(user)) {
    const childIds = await getChildDelegationIds(user.delegacion_id);
    return childIds.includes(delegacionId);
  }
  if (isAvisador(user)) {
    return user.delegacion_asignada_id === delegacionId;
  }
  return false;
};

export const ensureSolicitudAccess = async (user, solicitud, message = 'No tienes permiso para acceder a esta solicitud') => {
  if (isPrivileged(user)) {
    return;
  }

  if (isAvisador(user)) {
    const isCreator = solicitud.creado_por === user.id;
    const isAssigned = await canAccessDelegacion(user, solicitud.delegacion_origen_id);
    if (!isCreator && !isAssigned) {
      const error = new Error(message);
      error.statusCode = 403;
      throw error;
    }
    return;
  }

  if (isOperador(user) || isGestor(user)) {
    const canAccess = await canAccessDelegacion(user, solicitud.delegacion_origen_id);
    if (!canAccess) {
      const error = new Error(message);
      error.statusCode = 403;
      throw error;
    }
  }
};

export const ensureSolicitudOwnership = (user, solicitud, message = 'Solo el creador puede modificar la solicitud') => {
  if (isPrivileged(user)) {
    return;
  }

  if (solicitud.creado_por !== user.id) {
    const error = new Error(message);
    error.statusCode = 403;
    throw error;
  }
};

export const getVisibleDelegacionIds = async (user) => {
  if (isPrivileged(user)) {
    return null;
  }
  if (isAvisador(user) && !user.delegacion_asignada_id) {
    return [];
  }
  if (isAvisador(user)) {
    return [user.delegacion_asignada_id];
  }
  if (isOperador(user) || isGestor(user)) {
    return getChildDelegationIds(user.delegacion_id);
  }
  return [];
};

export { isOperador, isAvisador, isGestor, isPrivileged, invalidateChildDelegationCache };
