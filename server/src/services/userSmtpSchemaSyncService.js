import pool from '../config/db.js';

const ensureColumns = async (tableName, columns) => {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));

  for (const column of columns) {
    if (existingColumns.has(column.name)) {
      continue;
    }

    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`);
  }
};

const ensureForeignKeys = async (foreignKeys) => {
  for (const fk of foreignKeys) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
         AND REFERENCED_TABLE_NAME = ?`,
      [fk.fromTable, fk.fromColumn, fk.referencesTable]
    );

    if (rows[0].total > 0) {
      continue;
    }

    await pool.query(
      `ALTER TABLE ${fk.fromTable} ADD CONSTRAINT ${fk.constraintName} FOREIGN KEY (${fk.fromColumn}) REFERENCES ${fk.referencesTable}(${fk.referencesColumn})`
    );
  }
};

const ensureRolesEnum = async () => {
  const [rows] = await pool.query(
    `SELECT COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'
       AND COLUMN_NAME = 'rol'`
  );

  const currentType = rows[0]?.COLUMN_TYPE || '';
  const requiredValues = ['operador', 'gestor', 'admin', 'superadmin', 'avisador', 'tramitador_central'];
  const missingValues = requiredValues.filter((value) => !currentType.includes(`'${value}'`));

  if (missingValues.length === 0) {
    return;
  }

  await pool.query(
    `ALTER TABLE usuarios MODIFY COLUMN rol ENUM('operador','gestor','admin','superadmin','avisador','tramitador_central') NOT NULL`
  );
};

const usuariosColumns = [
  { name: 'smtp_enabled', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'smtp_host', definition: 'VARCHAR(255) NULL' },
  { name: 'smtp_port', definition: 'INT NULL' },
  { name: 'smtp_secure', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
  { name: 'smtp_user', definition: 'VARCHAR(255) NULL' },
  { name: 'smtp_pass_encrypted', definition: 'TEXT NULL' },
  { name: 'smtp_from_name', definition: 'VARCHAR(150) NULL' },
  { name: 'smtp_from_email', definition: 'VARCHAR(255) NULL' },
  { name: 'solicitud_destinatarios_email', definition: 'TEXT NULL' },
  { name: 'comision_pactada', definition: 'DECIMAL(5,2) DEFAULT 0.00' },
  { name: 'delegacion_asignada_id', definition: 'INT NULL' },
];

const delegacionesColumns = [
  { name: 'parent_delegacion_id', definition: 'INT NULL' },
];

const solicitudesColumns = [
  { name: 'contiene_lopd_sensible', definition: 'BOOLEAN DEFAULT FALSE' },
  { name: 'fecha_purgado', definition: 'DATETIME NULL' },
  { name: 'capital_estimado', definition: 'DECIMAL(12,2) NULL' },
  { name: 'prima_estimada', definition: 'DECIMAL(12,2) NULL' },
];

const comentariosColumns = [
  { name: 'es_interno', definition: 'BOOLEAN DEFAULT TRUE' },
];

const foreignKeys = [
  { constraintName: 'fk_usuarios_delegacion_asignada', fromTable: 'usuarios', fromColumn: 'delegacion_asignada_id', referencesTable: 'delegaciones', referencesColumn: 'id' },
  { constraintName: 'fk_delegaciones_parent', fromTable: 'delegaciones', fromColumn: 'parent_delegacion_id', referencesTable: 'delegaciones', referencesColumn: 'id' },
];

export const ensureUserSmtpSchema = async () => {
  await ensureColumns('usuarios', usuariosColumns);
  await ensureColumns('delegaciones', delegacionesColumns);
  await ensureColumns('solicitudes', solicitudesColumns);
  await ensureColumns('comentarios', comentariosColumns);
  await ensureRolesEnum();
  await ensureForeignKeys(foreignKeys);
};
