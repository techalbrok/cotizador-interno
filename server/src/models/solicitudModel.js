import pool from '../config/db.js';
import { withTransaction } from '../utils/db.js';

const parseDatosFormulario = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

const normalizeSolicitudRow = (row) => ({
  ...row,
  datos_formulario: parseDatosFormulario(row.datos_formulario),
});

export const createSolicitud = async (solicitudData) => {
  const { referencia, ramo, delegacion_origen_id, creado_por, datos_formulario, observaciones, contiene_lopd_sensible = false, capital_estimado = null, prima_estimada = null } = solicitudData;
  return withTransaction(async (connection) => {
    const [result] = await connection.query(
      'INSERT INTO solicitudes (referencia, ramo, estado, delegacion_origen_id, creado_por, datos_formulario, contiene_lopd_sensible, observaciones, capital_estimado, prima_estimada) VALUES (?, ?, "Borrador", ?, ?, ?, ?, ?, ?, ?)',
      [referencia, ramo, delegacion_origen_id, creado_por, JSON.stringify(datos_formulario), contiene_lopd_sensible, observaciones, capital_estimado, prima_estimada]
    );
    await connection.query(
      'INSERT INTO historico_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES (?, NULL, ?, ?, ?)',
      [result.insertId, 'Borrador', creado_por, 'Solicitud creada']
    );
    return result.insertId;
  });
};

export const getSolicitudById = async (id) => {
  const [rows] = await pool.query(`
    SELECT s.*, u.nombre as creador_nombre, d.nombre as delegacion_nombre
    FROM solicitudes s
    JOIN usuarios u ON s.creado_por = u.id
    JOIN delegaciones d ON s.delegacion_origen_id = d.id
    WHERE s.id = ?
  `, [id]);
  return rows[0] ? normalizeSolicitudRow(rows[0]) : null;
};

export const updateSolicitud = async (id, data) => {
  const { datos_formulario, observaciones } = data;
  await pool.query(
    'UPDATE solicitudes SET datos_formulario = ?, observaciones = ? WHERE id = ?',
    [JSON.stringify(datos_formulario), observaciones, id]
  );
};

export const updateEstado = async (id, estado) => {
  await pool.query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estado, id]);
};

export const deleteSolicitud = async (id) => {
  await pool.query('DELETE FROM solicitudes WHERE id = ?', [id]);
};

export const getSolicitudes = async (filters, limit, offset) => {
  const whereClauses = ['1=1'];
  const params = [];

  if (filters.estado) {
    whereClauses.push('s.estado = ?');
    params.push(filters.estado);
  }
  if (filters.ramo) {
    whereClauses.push('s.ramo = ?');
    params.push(filters.ramo);
  }
  if (filters.delegacion_id) {
    whereClauses.push('s.delegacion_origen_id = ?');
    params.push(filters.delegacion_id);
  }
  if (filters.creado_por) {
    whereClauses.push('s.creado_por = ?');
    params.push(filters.creado_por);
  }
  if (Array.isArray(filters.delegacion_ids) && filters.delegacion_ids.length > 0) {
    whereClauses.push(`s.delegacion_origen_id IN (${filters.delegacion_ids.map(() => '?').join(',')})`);
    params.push(...filters.delegacion_ids);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const query = `
    SELECT s.id, s.referencia, s.ramo, s.estado, s.created_at, s.datos_formulario, u.nombre as creador_nombre, d.nombre as delegacion_nombre
    FROM solicitudes s
    JOIN usuarios u ON s.creado_por = u.id
    JOIN delegaciones d ON s.delegacion_origen_id = d.id
    ${whereSql}
    ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `;
  const dataParams = [...params, limit, offset];
  const [rows] = await pool.query(query, dataParams);

  const countQuery = `SELECT COUNT(*) as total FROM solicitudes s ${whereSql}`;
  const [countRows] = await pool.query(countQuery, params);

  return { data: rows.map(normalizeSolicitudRow), total: countRows[0].total };
};

export const addHistorico = async (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) => {
  await pool.query(
    'INSERT INTO historico_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES (?, ?, ?, ?, ?)',
    [solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion]
  );
};

export const changeEstadoAtomically = async ({ id, estadoAnterior, estadoNuevo, usuarioId, observacion }) => {
  return withTransaction(async (connection) => {
    await connection.query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estadoNuevo, id]);
    await connection.query(
      'INSERT INTO historico_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES (?, ?, ?, ?, ?)',
      [id, estadoAnterior, estadoNuevo, usuarioId, observacion]
    );
  });
};

export const getHistoricoBySolicitud = async (solicitud_id) => {
  const [rows] = await pool.query(`
    SELECT h.*, u.nombre as usuario_nombre
    FROM historico_estados h
    JOIN usuarios u ON h.cambiado_por = u.id
    WHERE h.solicitud_id = ?
    ORDER BY h.cambiado_en DESC
  `, [solicitud_id]);
  return rows;
};

export const getDashboardStats = async (delegacionIds = null) => {
  const hasIds = Array.isArray(delegacionIds) ? delegacionIds.length > 0 : Boolean(delegacionIds);

  let where = '';
  const params = [];
  if (Array.isArray(delegacionIds) && delegacionIds.length > 0) {
    where = `WHERE delegacion_origen_id IN (${delegacionIds.map(() => '?').join(',')})`;
    params.push(...delegacionIds);
  } else if (typeof delegacionIds === 'number') {
    where = 'WHERE delegacion_origen_id = ?';
    params.push(delegacionIds);
  }

  const [estadoRows] = await pool.query(`SELECT estado, COUNT(*) as total FROM solicitudes ${where} GROUP BY estado`, params);
  const [ramoRows] = await pool.query(`SELECT ramo, COUNT(*) as total FROM solicitudes ${where} GROUP BY ramo`, params);

  const [ultimasRows] = await pool.query(`
    SELECT s.id, s.referencia, s.ramo, s.estado, s.created_at, u.nombre as creador_nombre
    FROM solicitudes s
    JOIN usuarios u ON s.creado_por = u.id
    ${where}
    ORDER BY s.created_at DESC LIMIT 10
  `, params);

  return {
    porEstado: estadoRows,
    porRamo: ramoRows,
    ultimas: ultimasRows,
    scoped: hasIds
  };
};
