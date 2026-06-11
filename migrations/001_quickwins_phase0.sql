-- ============================================================================
-- Migracion 001: Quick wins Fase 0
-- ============================================================================
-- Todos los cambios son ADITIVOS y compatibles con el esquema previo.
-- Aplicar con: mysql -u <user> -p < migrations/001_quickwins_phase0.sql
--
-- El bloque usa INFORMATION_SCHEMA para que los ALTER sean idempotentes
-- (re-ejecutar este script no falla si las columnas ya existen).
--
-- NOTA IMPORTANTE SOBRE EL `USE`:
-- Este script NO incluye `USE <base_de_datos>;` a proposito, para que
-- funcione tanto en CLI (seleccionando antes la BD con `mysql ... <db>`)
-- como en phpMyAdmin (que ya tiene la BD activa en el panel izquierdo).
-- En hosting con prefijo (p.ej. `u923287154_albroksa_cotiz`) esto evita
-- errores #1044 de "acceso denegado" al intentar `USE` una BD que no
-- es la propia del usuario.
--
-- Las FKs se nombran explicitamente (fk_*) para poder chequear su
-- existencia de forma determinista. Se valida con KEY_COLUMN_USAGE
-- (no TABLE_CONSTRAINTS, que no expone REFERENCED_TABLE_NAME).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 Extender ENUM de roles para soportar superadmin, avisador y
--     tramitador_central. No se elimina ningun valor existente.
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('operador','gestor','admin','superadmin','avisador','tramitador_central') NOT NULL;

-- ---------------------------------------------------------------------------
-- 3.2 Campos para la figura del Avisador (Fase 2 los activara)
-- ---------------------------------------------------------------------------
SET @col_comision := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'comision_pactada'
);
SET @sql := IF(@col_comision = 0,
  'ALTER TABLE usuarios ADD COLUMN comision_pactada DECIMAL(5,2) DEFAULT 0.00 AFTER delegacion_id',
  'SELECT "comision_pactada ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_del_asig := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'delegacion_asignada_id'
);
SET @sql := IF(@col_del_asig = 0,
  'ALTER TABLE usuarios ADD COLUMN delegacion_asignada_id INT NULL AFTER comision_pactada',
  'SELECT "delegacion_asignada_id ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK usuarios.delegacion_asignada_id -> delegaciones.id
SET @fk_del_asig := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'delegacion_asignada_id'
    AND REFERENCED_TABLE_NAME = 'delegaciones'
);
SET @sql := IF(@fk_del_asig = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_delegacion_asignada FOREIGN KEY (delegacion_asignada_id) REFERENCES delegaciones(id)',
  'SELECT "FK fk_usuarios_delegacion_asignada ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3.3 Jerarquia transversal de delegaciones (parent_delegacion_id)
-- ---------------------------------------------------------------------------
SET @col_parent := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delegaciones' AND COLUMN_NAME = 'parent_delegacion_id'
);
SET @sql := IF(@col_parent = 0,
  'ALTER TABLE delegaciones ADD COLUMN parent_delegacion_id INT NULL AFTER email_contacto',
  'SELECT "parent_delegacion_id ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK delegaciones.parent_delegacion_id -> delegaciones.id (autoreferencia)
SET @fk_parent := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'delegaciones'
    AND COLUMN_NAME = 'parent_delegacion_id'
    AND REFERENCED_TABLE_NAME = 'delegaciones'
);
SET @sql := IF(@fk_parent = 0,
  'ALTER TABLE delegaciones ADD CONSTRAINT fk_delegaciones_parent FOREIGN KEY (parent_delegacion_id) REFERENCES delegaciones(id)',
  'SELECT "FK fk_delegaciones_parent ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3.4 Flag LOPD y fecha de purgado automatico
-- ---------------------------------------------------------------------------
SET @col_lopd := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'contiene_lopd_sensible'
);
SET @sql := IF(@col_lopd = 0,
  'ALTER TABLE solicitudes ADD COLUMN contiene_lopd_sensible BOOLEAN DEFAULT FALSE AFTER datos_formulario',
  'SELECT "contiene_lopd_sensible ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_purgado := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'fecha_purgado'
);
SET @sql := IF(@col_purgado = 0,
  'ALTER TABLE solicitudes ADD COLUMN fecha_purgado DATETIME NULL AFTER contiene_lopd_sensible',
  'SELECT "fecha_purgado ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3.5 Capitales/prima denormalizados (DECIMAL 12,2) para analitica SQL
-- ---------------------------------------------------------------------------
SET @col_capital := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'capital_estimado'
);
SET @sql := IF(@col_capital = 0,
  'ALTER TABLE solicitudes ADD COLUMN capital_estimado DECIMAL(12,2) NULL AFTER observaciones',
  'SELECT "capital_estimado ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_prima := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'prima_estimada'
);
SET @sql := IF(@col_prima = 0,
  'ALTER TABLE solicitudes ADD COLUMN prima_estimada DECIMAL(12,2) NULL AFTER capital_estimado',
  'SELECT "prima_estimada ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3.6 Comentarios internos vs publicos (visible para avisador en Fase 2)
-- ---------------------------------------------------------------------------
SET @col_interno := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comentarios' AND COLUMN_NAME = 'es_interno'
);
SET @sql := IF(@col_interno = 0,
  'ALTER TABLE comentarios ADD COLUMN es_interno BOOLEAN DEFAULT TRUE AFTER comentario',
  'SELECT "es_interno ya existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
