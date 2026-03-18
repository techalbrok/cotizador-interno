# Cotizador Interno - Tech Albrok

Sistema interno para la gestión y generación de cotizaciones de seguros de Albroksa. Este canal permite a los usuarios internos procesar solicitudes, gestionar compañías y generar PDFs detallados para los clientes.

## Características Principales

- **Gestión de Solicitudes**: Seguimiento detallado de cada petición de cotización.
- **Base de Datos de Compañerías**: Configuración flexible de campos y tipos para diferentes aseguradoras.
- **Generación de PDFs**: Creación automática de documentos de cotización con diseño profesional.
- **Panel de Administración**: Control total sobre usuarios, roles y configuraciones del sistema.
- **Integración con IA**: Soporte inteligente para el procesamiento de datos asistido por Gemini AI.

## Requisitos Previos

- **Node.js**: Versión 18 o superior.
- **Base de Datos**: MySQL/MariaDB configurada.
- **API Key**: Clave de API de Gemini para funciones inteligentes.

## Instalación y Configuración

1. **Instalar Dependencias**:
   ```bash
   npm install
   ```

2. **Configurar Entorno**:
   Copia el archivo `.env.example` a `.env` y completa las variables necesarias:
   ```bash
   cp .env.example .env
   ```
   Asegúrate de configurar `GEMINI_API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.

3. **Iniciar en Desarrollo**:
   ```bash
   npm run dev
   ```

4. **Construir para Producción**:
   ```bash
   npm run build
   ```

## Estructura del Proyecto

- `/src`: Código fuente del frontend (React + Vite).
- `/server`: Lógica del backend (Node.js + Express).
- `/files`: Recursos y plantillas adicionales.

---

© 2026 Tech Albrok - Todos los derechos reservados.
