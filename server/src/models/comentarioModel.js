import pool from '../config/db.js';

export const createComentario = async ({ solicitud_id, usuario_id, comentario, es_interno = true }) => {
  const [result] = await pool.query(
    'INSERT INTO comentarios (solicitud_id, usuario_id, comentario, es_interno) VALUES (?, ?, ?, ?)',
    [solicitud_id, usuario_id, comentario, es_interno ? 1 : 0]
  );
  return result.insertId;
};

export const getComentariosBySolicitud = async (solicitud_id, { onlyPublic = false } = {}) => {
  const where = onlyPublic ? 'WHERE c.solicitud_id = ? AND c.es_interno = FALSE' : 'WHERE c.solicitud_id = ?';
  const [rows] = await pool.query(`
    SELECT c.*, u.nombre as usuario_nombre, u.rol as usuario_rol
    FROM comentarios c
    JOIN usuarios u ON c.usuario_id = u.id
    ${where}
    ORDER BY c.created_at ASC
  `, [solicitud_id]);
  return rows;
};
