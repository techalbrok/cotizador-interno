import pool from '../config/db.js';

export const generarReferencia = async () => {
  const year = new Date().getFullYear();
  
  // Buscar la última referencia del año actual
  const [rows] = await pool.query(
    'SELECT referencia FROM solicitudes WHERE referencia LIKE ? ORDER BY id DESC LIMIT 1',
    [`ALB-${year}-%`]
  );

  let secuencial = 1;
  if (rows.length > 0) {
    const ultimaRef = rows[0].referencia;
    const partes = ultimaRef.split('-');
    secuencial = parseInt(partes[2], 10) + 1;
  }

  // Formatear a 4 dígitos
  const secuencialStr = secuencial.toString().padStart(4, '0');
  return `ALB-${year}-${secuencialStr}`;
};
