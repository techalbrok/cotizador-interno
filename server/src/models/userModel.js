import pool from '../config/db.js';

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query(`
    SELECT u.*, d.nombre as delegacion_nombre
    FROM usuarios u
    LEFT JOIN delegaciones d ON u.delegacion_id = d.id
    WHERE u.email = ? AND u.activo = TRUE
  `, [email]);
  return rows[0];
};

export const findUserById = async (id) => {
  const [rows] = await pool.query(`
    SELECT u.id, u.nombre, u.email, u.rol, u.delegacion_id, u.comision_pactada, u.delegacion_asignada_id, u.activo, d.nombre as delegacion_nombre
    FROM usuarios u
    LEFT JOIN delegaciones d ON u.delegacion_id = d.id
    WHERE u.id = ?
  `, [id]);
  return rows[0];
};

export const findUserWithPasswordById = async (id) => {
  const [rows] = await pool.query(`
    SELECT id, nombre, email, rol, delegacion_id, comision_pactada, delegacion_asignada_id, activo, password_hash
    FROM usuarios
    WHERE id = ?
  `, [id]);
  return rows[0];
};

export const findUserSmtpSettingsById = async (id) => {
  const [rows] = await pool.query(`
    SELECT id, smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, smtp_from_name, smtp_from_email, solicitud_destinatarios_email
    FROM usuarios
    WHERE id = ?
  `, [id]);
  return rows[0];
};

export const findAllUsers = async () => {
  const [rows] = await pool.query(`
    SELECT u.id, u.nombre, u.email, u.rol, u.delegacion_id, u.comision_pactada, u.delegacion_asignada_id, u.activo, u.created_at, d.nombre as delegacion_nombre
    FROM usuarios u
    LEFT JOIN delegaciones d ON u.delegacion_id = d.id
    ORDER BY u.created_at DESC
  `);
  return rows;
};

export const createUser = async (userData) => {
  const { nombre, email, password_hash, rol, delegacion_id, comision_pactada = 0, delegacion_asignada_id = null } = userData;
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol, delegacion_id, comision_pactada, delegacion_asignada_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [nombre, email, password_hash, rol, delegacion_id, comision_pactada, delegacion_asignada_id]
  );
  return result.insertId;
};

export const updateUser = async (id, userData) => {
  const { nombre, email, rol, delegacion_id, comision_pactada = null, delegacion_asignada_id = null, password_hash } = userData;

  if (password_hash) {
    await pool.query(
      'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, delegacion_id = ?, comision_pactada = ?, delegacion_asignada_id = ?, password_hash = ? WHERE id = ?',
      [nombre, email, rol, delegacion_id, comision_pactada, delegacion_asignada_id, password_hash, id]
    );
    return;
  }

  await pool.query(
    'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, delegacion_id = ?, comision_pactada = ?, delegacion_asignada_id = ? WHERE id = ?',
    [nombre, email, rol, delegacion_id, comision_pactada, delegacion_asignada_id, id]
  );
};

export const toggleUserActive = async (id, activo) => {
  await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);
};

export const updateUserPassword = async (id, password_hash) => {
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [password_hash, id]);
};

export const updateUserSmtpSettings = async (id, smtpSettings) => {
  const {
    smtp_enabled,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_user,
    smtp_pass_encrypted,
    smtp_from_name,
    smtp_from_email,
    solicitud_destinatarios_email,
  } = smtpSettings;

  await pool.query(
    `UPDATE usuarios
     SET smtp_enabled = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?, smtp_pass_encrypted = ?, smtp_from_name = ?, smtp_from_email = ?, solicitud_destinatarios_email = ?
     WHERE id = ?`,
    [smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_encrypted, smtp_from_name, smtp_from_email, solicitud_destinatarios_email, id]
  );
};
