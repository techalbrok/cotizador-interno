import pool from '../config/db.js';

export const getComentariosBySolicitud = async (solicitud_id) => {
  const [rows] = await pool.query(`
    SELECT c.*, u.nombre as usuario_nombre
    FROM comentarios c
    JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.solicitud_id = ?
    ORDER BY c.created_at ASC
  `, [solicitud_id]);
  return rows;
};

export const createComentario = async (solicitud_id, usuario_id, comentario) => {
  const [result] = await pool.query(
    'INSERT INTO comentarios (solicitud_id, usuario_id, comentario) VALUES (?, ?, ?)',
    [solicitud_id, usuario_id, comentario]
  );
  return result.insertId;
};
