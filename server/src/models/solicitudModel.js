import pool from '../config/db.js';

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
  const { referencia, ramo, delegacion_origen_id, creado_por, datos_formulario, observaciones } = solicitudData;
  const [result] = await pool.query(
    'INSERT INTO solicitudes (referencia, ramo, estado, delegacion_origen_id, creado_por, datos_formulario, observaciones) VALUES (?, ?, "Borrador", ?, ?, ?, ?)',
    [referencia, ramo, delegacion_origen_id, creado_por, JSON.stringify(datos_formulario), observaciones]
  );
  return result.insertId;
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
  let query = `
    SELECT s.id, s.referencia, s.ramo, s.estado, s.created_at, s.datos_formulario, u.nombre as creador_nombre, d.nombre as delegacion_nombre
    FROM solicitudes s
    JOIN usuarios u ON s.creado_por = u.id
    JOIN delegaciones d ON s.delegacion_origen_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.estado) {
    query += ' AND s.estado = ?';
    params.push(filters.estado);
  }
  if (filters.ramo) {
    query += ' AND s.ramo = ?';
    params.push(filters.ramo);
  }
  if (filters.delegacion_id) {
    query += ' AND s.delegacion_origen_id = ?';
    params.push(filters.delegacion_id);
  }

  query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  
  // Count total
  let countQuery = 'SELECT COUNT(*) as total FROM solicitudes s WHERE 1=1';
  const countParams = [];
  if (filters.estado) { countQuery += ' AND s.estado = ?'; countParams.push(filters.estado); }
  if (filters.ramo) { countQuery += ' AND s.ramo = ?'; countParams.push(filters.ramo); }
  if (filters.delegacion_id) { countQuery += ' AND s.delegacion_origen_id = ?'; countParams.push(filters.delegacion_id); }
  
  const [countRows] = await pool.query(countQuery, countParams);
  
  return { data: rows.map(normalizeSolicitudRow), total: countRows[0].total };
};

export const addHistorico = async (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) => {
  await pool.query(
    'INSERT INTO historico_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES (?, ?, ?, ?, ?)',
    [solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion]
  );
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

export const getDashboardStats = async (delegacion_id = null) => {
  let where = delegacion_id ? 'WHERE delegacion_origen_id = ?' : '';
  const params = delegacion_id ? [delegacion_id] : [];

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
    ultimas: ultimasRows
  };
};
