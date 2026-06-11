import pool from '../config/db.js';

const parseSchemaJson = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value;
};

export const getFormularioByRamo = async (ramo) => {
  const [rows] = await pool.query(
    'SELECT schema_json FROM formularios_config WHERE ramo = ? AND activo = TRUE ORDER BY version DESC LIMIT 1',
    [ramo]
  );
  if (!rows[0]) {
    return null;
  }

  return {
    ...rows[0],
    schema_json: parseSchemaJson(rows[0].schema_json),
  };
};

export const syncFormularioSchema = async (ramo, schema) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT id, schema_json, version, activo FROM formularios_config WHERE ramo = ? ORDER BY version DESC FOR UPDATE',
      [ramo]
    );

    const normalizedRows = rows.map((row) => ({
      ...row,
      schema_json: parseSchemaJson(row.schema_json),
    }));

    const currentVersion = normalizedRows[0]?.version || 0;
    const activeRow = normalizedRows.find((row) => Boolean(row.activo)) || normalizedRows[0] || null;
    const serializedSchema = JSON.stringify(schema);

    if (activeRow && JSON.stringify(activeRow.schema_json) === serializedSchema) {
      if (!activeRow.activo) {
        await connection.query('UPDATE formularios_config SET activo = FALSE WHERE ramo = ?', [ramo]);
        await connection.query('UPDATE formularios_config SET activo = TRUE WHERE id = ?', [activeRow.id]);
      }

      await connection.commit();
      return { updated: false, version: activeRow.version };
    }

    await connection.query('UPDATE formularios_config SET activo = FALSE WHERE ramo = ?', [ramo]);
    await connection.query(
      'INSERT INTO formularios_config (ramo, schema_json, version, activo) VALUES (?, ?, ?, TRUE)',
      [ramo, serializedSchema, currentVersion + 1]
    );

    await connection.commit();
    return { updated: true, version: currentVersion + 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
