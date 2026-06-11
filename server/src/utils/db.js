import pool from '../config/db.js';

export const withTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error durante rollback de transaccion:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};
