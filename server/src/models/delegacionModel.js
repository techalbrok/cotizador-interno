import pool from '../config/db.js';

export const getDelegacionById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM delegaciones WHERE id = ?', [id]);
  return rows[0];
};

export const getAllDelegaciones = async () => {
  const [rows] = await pool.query('SELECT * FROM delegaciones');
  return rows;
};

export const createDelegacion = async (delegacionData) => {
  const { nombre, email_contacto, parent_delegacion_id = null } = delegacionData;
  const [result] = await pool.query(
    'INSERT INTO delegaciones (nombre, email_contacto, parent_delegacion_id) VALUES (?, ?, ?)',
    [nombre, email_contacto, parent_delegacion_id]
  );
  return result.insertId;
};

export const updateDelegacion = async (id, delegacionData) => {
  const { nombre, email_contacto, parent_delegacion_id = null } = delegacionData;
  await pool.query(
    'UPDATE delegaciones SET nombre = ?, email_contacto = ?, parent_delegacion_id = ? WHERE id = ?',
    [nombre, email_contacto, parent_delegacion_id, id]
  );
};

export const toggleDelegacionActive = async (id, activa) => {
  await pool.query('UPDATE delegaciones SET activa = ? WHERE id = ?', [activa, id]);
};
