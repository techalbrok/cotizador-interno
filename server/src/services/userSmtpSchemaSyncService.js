import pool from '../config/db.js';

const smtpColumns = [
  { name: 'smtp_enabled', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'smtp_host', definition: 'VARCHAR(255) NULL' },
  { name: 'smtp_port', definition: 'INT NULL' },
  { name: 'smtp_secure', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'smtp_user', definition: 'VARCHAR(255) NULL' },
  { name: 'smtp_pass_encrypted', definition: 'TEXT NULL' },
  { name: 'smtp_from_name', definition: 'VARCHAR(150) NULL' },
  { name: 'smtp_from_email', definition: 'VARCHAR(255) NULL' },
  { name: 'solicitud_destinatarios_email', definition: 'TEXT NULL' },
];

export const ensureUserSmtpSchema = async () => {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'`
  );

  const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));

  for (const column of smtpColumns) {
    if (existingColumns.has(column.name)) {
      continue;
    }

    await pool.query(`ALTER TABLE usuarios ADD COLUMN ${column.name} ${column.definition}`);
  }
};
