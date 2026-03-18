import pool from '../config/db.js';

export const getDelegacionById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM delegaciones WHERE id = ?', [id]);
  return rows[0];
};

export const getAllDelegaciones = async () => {
  const [rows] = await pool.query('SELECT * FROM delegaciones');
  return rows;
};
