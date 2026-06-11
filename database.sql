-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS albroksa_cotizador;
USE albroksa_cotizador;

-- 1. delegaciones
CREATE TABLE IF NOT EXISTS delegaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email_contacto VARCHAR(150) NOT NULL,
  parent_delegacion_id INT NULL,
  activa BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (parent_delegacion_id) REFERENCES delegaciones(id)
);

-- 2. usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('operador', 'gestor', 'admin', 'superadmin', 'avisador', 'tramitador_central') NOT NULL,
  delegacion_id INT,
  comision_pactada DECIMAL(5,2) DEFAULT 0.00,
  delegacion_asignada_id INT NULL,
  activo BOOLEAN DEFAULT TRUE,
  smtp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_host VARCHAR(255) NULL,
  smtp_port INT NULL,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_user VARCHAR(255) NULL,
  smtp_pass_encrypted TEXT NULL,
  smtp_from_name VARCHAR(150) NULL,
  smtp_from_email VARCHAR(255) NULL,
  solicitud_destinatarios_email TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delegacion_id) REFERENCES delegaciones(id),
  FOREIGN KEY (delegacion_asignada_id) REFERENCES delegaciones(id)
);

-- 3. formularios_config
CREATE TABLE IF NOT EXISTS formularios_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ramo ENUM('Auto', 'Hogar', 'Comercio', 'Salud Extranjería') NOT NULL,
  schema_json JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  INDEX idx_formularios_ramo_activo_version (ramo, activo, version)
);

-- 4. solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referencia VARCHAR(20) NOT NULL UNIQUE,
  ramo ENUM('Auto', 'Hogar', 'Comercio', 'Salud Extranjería') NOT NULL,
  estado ENUM('Borrador', 'Enviada', 'En gestión', 'Respondida', 'Emitida', 'Cancelada') NOT NULL DEFAULT 'Borrador',
  delegacion_origen_id INT NOT NULL,
  creado_por INT NOT NULL,
  datos_formulario JSON,
  contiene_lopd_sensible BOOLEAN DEFAULT FALSE,
  fecha_purgado DATETIME NULL,
  observaciones TEXT,
  capital_estimado DECIMAL(12,2) NULL,
  prima_estimada DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (delegacion_origen_id) REFERENCES delegaciones(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- 5. adjuntos
CREATE TABLE IF NOT EXISTS adjuntos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  ruta_servidor VARCHAR(255) NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  tamanio_bytes INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE
);

-- 6. historico_estados
CREATE TABLE IF NOT EXISTS historico_estados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  estado_anterior ENUM('Borrador', 'Enviada', 'En gestión', 'Respondida', 'Emitida', 'Cancelada'),
  estado_nuevo ENUM('Borrador', 'Enviada', 'En gestión', 'Respondida', 'Emitida', 'Cancelada') NOT NULL,
  cambiado_por INT NOT NULL,
  cambiado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observacion TEXT,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  FOREIGN KEY (cambiado_por) REFERENCES usuarios(id)
);

-- 7. comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT NOT NULL,
  usuario_id INT NOT NULL,
  comentario TEXT NOT NULL,
  es_interno BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ==========================================
-- DATOS DE EJEMPLO
-- ==========================================

-- Delegaciones
INSERT INTO delegaciones (nombre, email_contacto) VALUES 
('Fuenlabrada', 'fuenlabrada@albroksa.com'),
('Candeleda', 'candeleda@albroksa.com');

-- Usuarios (Password para todos es: Password123! -> hash generado con bcrypt)
-- Hash de 'Password123!': $2b$10$iB0pdVne8Z0xrih93VflC.lJORKCAeFtyh8t35I.km4Q.AZ5XBbZK
INSERT INTO usuarios (nombre, email, password_hash, rol, delegacion_id) VALUES 
('Admin General', 'admin@albroksa.com', '$2b$10$iB0pdVne8Z0xrih93VflC.lJORKCAeFtyh8t35I.km4Q.AZ5XBbZK', 'admin', NULL),
('Operador Fuenlabrada', 'operador@albroksa.com', '$2b$10$iB0pdVne8Z0xrih93VflC.lJORKCAeFtyh8t35I.km4Q.AZ5XBbZK', 'operador', 1),
('Gestor Candeleda', 'gestor@albroksa.com', '$2b$10$iB0pdVne8Z0xrih93VflC.lJORKCAeFtyh8t35I.km4Q.AZ5XBbZK', 'gestor', 2);

-- Formularios Config
-- Los formularios dinámicos se sincronizan automáticamente desde la aplicación
-- al arrancar el servidor. No es necesario sembrarlos manualmente aquí.

-- Solicitudes
INSERT INTO solicitudes (referencia, ramo, estado, delegacion_origen_id, creado_por, datos_formulario, observaciones) VALUES 
('ALB-2026-0001', 'Auto', 'Borrador', 1, 2, '{"marca": "Toyota", "modelo": "Corolla"}', 'Falta adjuntar carnet'),
('ALB-2026-0002', 'Hogar', 'Enviada', 1, 2, '{"direccion": "Calle Mayor 1", "metros_cuadrados": 90}', 'Urgente'),
('ALB-2026-0003', 'Comercio', 'En gestión', 1, 2, '{"actividad": "Restaurante", "facturacion": 150000}', 'Revisando coberturas de RC'),
('ALB-2026-0004', 'Salud Extranjería', 'Emitida', 1, 2, '{"fecha_nacimiento": "1990-05-15", "nacionalidad": "Colombiana"}', 'Póliza enviada al cliente');

-- Histórico
INSERT INTO historico_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES 
(2, 'Borrador', 'Enviada', 2, 'Enviado a Candeleda'),
(3, 'Borrador', 'Enviada', 2, 'Enviado a Candeleda'),
(3, 'Enviada', 'En gestión', 3, 'Iniciando cotización'),
(4, 'Borrador', 'Enviada', 2, 'Enviado a Candeleda'),
(4, 'Enviada', 'En gestión', 3, 'Iniciando cotización'),
(4, 'En gestión', 'Emitida', 3, 'Póliza emitida correctamente');
