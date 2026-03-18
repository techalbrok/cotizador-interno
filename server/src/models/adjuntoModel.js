import pool from '../config/db.js';

export const createAdjunto = async (adjuntoData) => {
  const { solicitud_id, nombre_original, ruta_servidor, mimetype, tamanio_bytes } = adjuntoData;
  const [result] = await pool.query(
    'INSERT INTO adjuntos (solicitud_id, nombre_original, ruta_servidor, mimetype, tamanio_bytes) VALUES (?, ?, ?, ?, ?)',
    [solicitud_id, nombre_original, ruta_servidor, mimetype, tamanio_bytes]
  );
  return result.insertId;
};

export const getAdjuntosBySolicitud = async (solicitud_id) => {
  const [rows] = await pool.query('SELECT * FROM adjuntos WHERE solicitud_id = ?', [solicitud_id]);
  return rows;
};

export const getAdjuntoById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM adjuntos WHERE id = ?', [id]);
  return rows[0];
};

export const deleteAdjunto = async (id) => {
  await pool.query('DELETE FROM adjuntos WHERE id = ?', [id]);
};
