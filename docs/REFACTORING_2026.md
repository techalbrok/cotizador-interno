# Refactorización del Cotizador Interno — 2026

Documento de referencia de las mejoras aplicadas en 4 fases (0–3) sobre el Cotizador Interno de Albroksa. Cubre arquitectura, decisiones, esquema de BBDD, sistema de eventos, validaciones, y pendientes.

> **Audiencia:** developers retomando el proyecto, PMs que necesiten contexto, próximos sprints.
> **Última actualización:** tras cierre de Fase 3.

---

## 1. Resumen ejecutivo

Partíamos de un Express + React + MySQL monolítico con buenas bases (BBDD normalizada, schemas dinámicos por ramo, Nodemailer, JWT, multer) pero con tres grandes problemas para escalar a 180+ delegaciones:

1. **Picos de carga derribaban el pool** (10 conexiones fijas, sin keep-alive).
2. **Emails bloqueaban el HTTP request** (envío SMTP síncrono en el handler).
3. **Cero validación runtime de payloads** más allá de comprobaciones manuales dispersas.

Tras 4 fases el sistema:

- Procesa emails en background con **p-queue** + reintentos exponenciales.
- Aplica **transacciones ACID** en cada cambio de estado + histórico.
- Valida el **payload de creación de solicitud contra el esquema dinámico** de `formularios_config` con **Zod**.
- Soporta **6 roles** (`operador`, `gestor`, `admin`, `superadmin`, `avisador`, `tramitador_central`).
- Soporta **jerarquía de delegaciones** vía `parent_delegacion_id` con CTE recursivo.
- Tiene **migraciones SQL idempotentes** y un **sync service** que auto-repara el esquema al arrancar el servidor.

---

## 2. Estado actual (post-Fase 3)

### Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite + TypeScript | 19 / 6.2 |
| Backend | Node.js + Express | 22.14 / 4.22 |
| ORM/DB driver | mysql2/promise | 3.20 |
| Cola async | p-queue | 8.0 |
| Templates email | handlebars | 4.7 |
| Validación | zod | 4.3 |
| Auth | JWT (jsonwebtoken) + bcrypt | 9.0 / 6.0 |
| SMTP | nodemailer | 8.0 |
| OCR/IA | OpenRouter (Vía API) | n/a |

### Estructura de carpetas (post-refactor)

```
server/src/
├── config/
│   ├── db.js                 # pool 20 conexiones, keepAlive, maxIdle
│   ├── email.js              # transporter Nodemailer por defecto
│   └── secrets.js
├── controllers/              # validación Zod en cada uno
├── data/formSchemas.js       # fallback estático (Auto/Hogar/Comercio/Salud)
├── events/
│   ├── eventBus.js           # EventEmitter singleton
│   ├── notificationQueue.js  # p-queue + reintentos 2-4-8s
│   └── handlers/
│       └── emailHandler.js   # suscribe solicitud.enviada, solicitud.estadoCambiado
├── middleware/
│   ├── auth.js               # JWT + cookie
│   ├── errorHandler.js
│   └── validateSolicitudPayload.js   # Zod dinámico contra formularios_config
├── models/                   # CRUD puro, sin lógica de negocio
├── routes/
├── schemas/                  # Zod schemas reutilizables
│   ├── authSchemas.js
│   ├── formSchemaToZod.js    # compilador de FormSchema -> Zod
│   ├── solicitudSchemas.js
│   └── userSchemas.js
├── services/
│   ├── emailService.js       # usa Handlebars, sin envío síncrono
│   ├── formularioSyncService.js
│   ├── referenciaService.js
│   ├── userSmtpSchemaSyncService.js   # auto-repara BBDD al arrancar
│   └── userSmtpService.js
├── templates/emails/
│   ├── base.hbs              # layout HTML con branding Albroksa
│   ├── solicitud-enviada.json
│   ├── solicitud-respondida.json
│   ├── solicitud-emitida.json
│   └── solicitud-cancelada.json
└── utils/
    ├── authCookies.js
    ├── crypto.js
    ├── db.js                 # helper withTransaction
    ├── emailErrors.js
    ├── fileValidation.js
    ├── smtpTargetValidation.js
    ├── solicitudPermissions.js       # async, con jerarquía recursiva
    └── uploadStorage.js

migrations/
└── 001_quickwins_phase0.sql  # 6 ALTER idempotentes (en INFORMATION_SCHEMA)

src/
├── components/Layout.tsx     # navegación condicional por rol
├── context/AuthContext.tsx   # 6 roles, expone delegacion_asignada_id
├── pages/
│   ├── AvisadorDashboard.tsx # NUEVO: vista simplificada para avisador
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── NewRequest.tsx
│   ├── RequestDetail.tsx
│   └── Settings.tsx          # CRUD usuarios con campos avisador
├── types.ts                  # tipos compartidos
└── lib/
    ├── api.ts
    └── ui.ts
```

---

## 3. Fase 0 — Quick wins (✅ aplicada)

### 3.1 Pool de conexiones

**Archivo:** `server/src/config/db.js`

```js
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'albroksa_cotizador',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 20,  // era 10
  queueLimit: 0,
  maxIdle: 10,                                                // libera ociosas
  enableKeepAlive: true,                                      // evita TCP drops
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
});
```

Configurable vía `DB_POOL_LIMIT` en `.env`.

### 3.2 Transacciones ACID

**Helper nuevo:** `server/src/utils/db.js`

```js
export const withTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch (e) { console.error(e); }
    throw error;
  } finally {
    connection.release();
  }
};
```

**Función nueva en el modelo:** `server/src/models/solicitudModel.js`

```js
export const changeEstadoAtomically = async ({ id, estadoAnterior, estadoNuevo, usuarioId, observacion }) => {
  return withTransaction(async (connection) => {
    await connection.query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estadoNuevo, id]);
    await connection.query(
      'INSERT INTO historico_estados (solicitud_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES (?, ?, ?, ?, ?)',
      [id, estadoAnterior, estadoNuevo, usuarioId, observacion]
    );
  });
};
```

`createSolicitud` también es atómica (INSERT solicitud + INSERT histórico inicial).

### 3.3 Migraciones SQL idempotentes

**Archivo:** `migrations/001_quickwins_phase0.sql`

6 ALTER no destructivos, todos con guardas `INFORMATION_SCHEMA`:

1. Extender ENUM `usuarios.rol` con `superadmin`, `avisador`, `tramitador_central`.
2. Añadir `usuarios.comision_pactada` (DECIMAL 5,2) y `usuarios.delegacion_asignada_id` (INT NULL con FK).
3. Añadir `delegaciones.parent_delegacion_id` (INT NULL con FK autoreferencial).
4. Añadir `solicitudes.contiene_lopd_sensible` (BOOLEAN) y `solicitudes.fecha_purgado` (DATETIME).
5. Añadir `solicitudes.capital_estimado` y `solicitudes.prima_estimada` (DECIMAL 12,2).
6. Añadir `comentarios.es_interno` (BOOLEAN DEFAULT TRUE).

**Importante:** El script **NO incluye** `USE <base_de_datos>` para funcionar tanto en CLI (seleccionando antes la BD) como en phpMyAdmin con hosting compartido (BD prefijada como `u923287154_albroksa_cotiz`).

Las FKs usan nombres explícitos: `fk_usuarios_delegacion_asignada`, `fk_delegaciones_parent`. Esto se chequea en `KEY_COLUMN_USAGE` (no en `TABLE_CONSTRAINTS`, que no tiene `REFERENCED_TABLE_NAME`).

### 3.4 Auto-reparación al arrancar

**Archivo:** `server/src/services/userSmtpSchemaSyncService.js`

`ensureUserSmtpSchema()` se ejecuta en `server/src/server.js:startServer()`:

- Crea columnas faltantes (SMTP + las nuevas de Fase 0).
- Aplica `MODIFY COLUMN` al ENUM de `usuarios.rol` si faltan valores.
- Crea las FKs faltantes con nombres explícitos.

**Limitación:** este auto-`MODIFY COLUMN` puede fallar en algunos hostings por permisos. En ese caso, correr `migrations/001_quickwins_phase0.sql` manualmente.

### 3.5 Aplicar la migración

```bash
# Opción 1: CLI
mysql -u <user> -p < migrations/001_quickwins_phase0.sql

# Opción 2: phpMyAdmin
# - Seleccionar la BD en el panel izquierdo
# - Pestaña SQL → pegar el contenido del archivo → Continuar
```

**`database.sql` raíz** también está actualizado con las nuevas columnas para nuevas instalaciones.

### 3.6 Nuevos campos expuestos en `/api/auth/me`

El JWT y la respuesta de login/`/me` ahora incluyen:

```js
{
  id, nombre, email, rol,
  delegacion_id,
  delegacion_asignada_id,    // NUEVO
  comision_pactada,          // NUEVO
  delegacion_nombre,
}
```

---

## 4. Fase 1 — Notificaciones asíncronas (✅ aplicada)

### 4.1 Arquitectura

```
HTTP request               Background
┌──────────────┐           ┌──────────────────┐
│ Controller   │─ emit ───>│ eventBus         │
│  (síncrono)  │           │  (EventEmitter)  │
└──────┬───────┘           └────────┬─────────┘
       │                            │
       │ commit ACID                │ on(solicitud.enviada)
       │                            ▼
       ▼                   ┌────────────────────┐
   response 200            │ emailHandler       │
                           │  (suscrito)        │
                           └─────────┬──────────┘
                                     │ enqueue
                                     ▼
                           ┌────────────────────┐
                           │ notificationQueue  │  p-queue
                           │  concurrency: 3    │  (3 reintentos,
                           │  timeout: 60s      │   backoff 2/4/8s)
                           └─────────┬──────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │ SMTP transporter   │
                           │ (per-user o global)│
                           └────────────────────┘
```

### 4.2 EventBus

**Archivo:** `server/src/events/eventBus.js`

```js
class AppEventBus extends EventEmitter { ... }
export const eventBus = new AppEventBus();

export const EVENTS = Object.freeze({
  SOLICITUD_CREADA: 'solicitud.creada',
  SOLICITUD_ENVIADA: 'solicitud.enviada',
  SOLICITUD_ESTADO_CAMBIADO: 'solicitud.estadoCambiado',
  SOLICITUD_COMENTARIO_ANADIDO: 'solicitud.comentarioAnadido',
});

// setImmediate para no bloquear el caller
export const emitAsync = (eventName, payload) => {
  setImmediate(() => {
    try { eventBus.emit(eventName, payload); }
    catch (e) { console.error(`[eventBus] ${eventName}:`, e); }
  });
};
```

### 4.3 Notification queue

**Archivo:** `server/src/events/notificationQueue.js`

- `concurrency: 3` (configurable con `EMAIL_CONCURRENCY`)
- `timeout: 60_000` (configurable con `EMAIL_TIMEOUT_MS`)
- **3 reintentos con backoff exponencial 2s → 4s → 8s**
- Tras agotar, loguea error final con `lastError`

### 4.4 Email handler

**Archivo:** `server/src/events/handlers/emailHandler.js`

```js
eventBus.on(EVENTS.SOLICITUD_ENVIADA, handleSolicitudEnviada);
eventBus.on(EVENTS.SOLICITUD_ESTADO_CAMBIADO, handleEstadoCambiado);
```

`registerEmailHandlers()` es idempotente (flag `registered`). Se llama una sola vez desde `server.js:startServer()`.

### 4.5 Plantillas Handlebars

- `server/src/templates/emails/base.hbs` — layout con header rojo Albroksa, tabla responsive, CTA button
- `solicitud-{enviada,respondida,emitida,cancelada}.json` — definición de campos (label + placeholder para `{{solicitud.referencia}}`)

`emailService.js:renderEmail()` compila con `Handlebars.compile()` y cachea en memoria (`templateCache`).

### 4.6 Cambios en el controller

| Endpoint | Antes | Ahora |
|---|---|---|
| `POST /solicitudes/:id/enviar` | `try { await enviarEmail(...) }` (bloquea HTTP) | Cambia estado a `Enviada` (ACID) + `emitAsync(SOLICITUD_ENVIADA)` → responde 200 inmediato |
| `PUT /solicitudes/:id/estado` | Sin email | Cambia estado (ACID) + `emitAsync(SOLICITUD_ESTADO_CAMBIADO)` → email en background |
| `POST /solicitudes/:id/comentarios` | Sin email | Igual |

### 4.7 Limitaciones

- **Jobs en memoria:** si el servidor se reinicia, los jobs pendientes se pierden. Para Fase 5 considerar BullMQ + Redis.
- **Notificaciones de fallo:** los emails que agotan reintentos solo se loguean. Sin panel de dead-letter por ahora.

---

## 5. Fase 2 — Roles avanzados y Avisador (✅ aplicada)

### 5.1 Matriz de roles

| Rol | Visibilidad solicitudes | Crea | Cambia estado | Comentarios | Settings |
|---|---|---|---|---|---|
| `operador` | Solo su delegación | Sí | Solo `Cancelada` | Internos | No |
| `gestor` | Su delegación + hijas recursivas | Sí | `En gestión`, `Respondida`, `Emitida`, `Cancelada` | Internos | No |
| `admin` | Todas | Sí | Todos | Internos | Sí |
| `superadmin` | Todas | Sí | Todos | Internos | Sí |
| `avisador` | Solo las que él creó (`creado_por=user.id`) | Sí, fuerza `delegacion_origen_id = delegacion_asignada_id` | Solo `Cancelada` | Solo públicos (filtra `es_interno=FALSE`) | No |
| `tramitador_central` | (mismo tratamiento que operador por ahora) | — | — | — | — |

### 5.2 Jerarquía de delegaciones

CTE recursivo en `server/src/utils/solicitudPermissions.js:getChildDelegationIds()`:

```sql
WITH RECURSIVE delegation_tree AS (
  SELECT id FROM delegaciones WHERE id = ?
  UNION ALL
  SELECT d.id FROM delegaciones d
  INNER JOIN delegation_tree dt ON d.parent_delegacion_id = dt.id
)
SELECT id FROM delegation_tree
```

Resultado cacheado en memoria (`Map`) por delegacion padre.

### 5.3 Permisos (`ensureSolicitudAccess`)

- `operador` / `gestor`: pasa si `canAccessDelegacion(user, solicitud.delegacion_origen_id)`.
- `avisador`: pasa si es creador (`creado_por === user.id`) **o** la solicitud está en su delegación asignada.
- `admin` / `superadmin`: siempre pasa.
- `delegacion_origen_id === null`: nunca pasa (solicitud huérfana).

### 5.4 Creación de solicitud por avisador

```js
let delegacionOrigenId = req.user.delegacion_id;
if (isAvisador(req.user)) {
  if (!req.user.delegacion_asignada_id) return res.status(400)...;
  delegacionOrigenId = req.user.delegacion_asignada_id;
}
```

El cliente NO puede sobreescribir el `delegacion_origen_id` desde el payload.

### 5.5 Comentarios filtrados para avisador

`getComentariosBySolicitud(id, { onlyPublic: isAvisador(req.user) })` ejecuta:

```sql
WHERE c.solicitud_id = ? AND c.es_interno = FALSE
```

### 5.6 Frontend para avisador

- `RoleHomeRedirect` en `App.tsx` envía automáticamente a `/avisador` si el rol es avisador.
- `AvisadorDashboard.tsx` — vista simplificada móvil-óptima: cards con sus avisos, botón "Nuevo aviso", sin acceso a Configuración.
- `Layout.tsx` — sidebar condicional: avisador solo ve "Mis avisos" + "Nuevo aviso".
- `Settings.tsx` — al crear usuario `avisador`, aparecen campos `comision_pactada` y `delegacion_asignada_id` obligatorios.

### 5.7 Pendiente de Fase 2

- Asignar `parent_delegacion_id` a las delegaciones existentes (Fuenlabrada, Candeleda, Cáceres) si se quiere habilitar la jerarquía real.
- Decidir alcance de `tramitador_central` (¿ve todas las delegaciones? ¿solo la central?).

---

## 6. Fase 3 — Validación Zod (✅ aplicada)

### 6.1 Capas de validación

```
HTTP request
    ↓
authenticate middleware (JWT)        ← Fase 0
    ↓
[POST /solicitudes] validateSolicitudPayload   ← NUEVO Fase 3
    ↓
controller (validación adicional de reglas de negocio)
    ↓
model (query a BBDD)
```

### 6.2 Compilador dinámico de Zod

**Archivo:** `server/src/schemas/formSchemaToZod.js`

Mapea cada tipo de campo del `FormSchema` a un Zod schema:

| Tipo campo | Zod | Notas |
|---|---|---|
| `text`, `textarea` | `z.string()` | |
| `email` | `z.string().refine(regex)` | |
| `tel` | `z.string().refine(/^[+\d\s()-]{6,}$/)` | |
| `number` | `z.coerce.number()` | convierte string → number |
| `date` | `z.string().refine(isValidDateString)` | rechaza `99/99/9999` |
| `select` | `z.string().refine(en values)` | valida contra options |
| `checkbox` | `z.boolean()` | |
| `checkboxGroup` | `z.array(z.string())` | |
| `section`, `info` | (omitido) | no se valida |

`isValidDateString` chequea formato YYYY-MM-DD o DD/MM/YYYY Y que la fecha sea semánticamente válida (rechaza 31/02/2025, 99/99/9999).

`passthrough()` permite campos extra sin error (extensibilidad futura).

### 6.3 Middleware

**Archivo:** `server/src/middleware/validateSolicitudPayload.js`

```js
1. Lee ramo de req.body
2. Carga esquema de formularios_config (DB) → fallback formSchemas.js
3. Compila Zod schema
4. safeParse(req.body)
5. Si falla → 400 con { message, errors: [{ path, message, code }] }
6. Si pasa → req.body = result.data (limpio)
```

Aplicado en `server/src/routes/solicitudRoutes.js`:

```js
router.post('/', validateSolicitudPayload, create);
```

### 6.4 Schemas Zod de endpoints

| Archivo | Schemas |
|---|---|
| `authSchemas.js` | `loginSchema`, `changePasswordSchema`, `smtpSettingsSchema` |
| `userSchemas.js` | `createUserSchema`, `updateUserSchema`, `toggleUserActiveSchema`, `createDelegacionSchema`, `updateDelegacionSchema`, `toggleDelegacionActiveSchema` |
| `solicitudSchemas.js` | `changeEstadoSchema`, `addComentarioSchema` |

Cada schema tiene `.refine()` para reglas de negocio:
- `createUser`: avisador sin `delegacion_asignada_id` → falla
- `changePassword`: `newPassword === confirmPassword` o `=== currentPassword` → falla
- `changeEstado`: `estado` debe ser uno de los 6 válidos

### 6.5 Formato de error consistente

```json
{
  "message": "Payload invalido",
  "errors": [
    { "path": "email", "message": "Email invalido" },
    { "path": "datos_formulario.tomador_telefono", "message": "Telefono invalido" }
  ]
}
```

El frontend ya recibe `errors[].path` para resaltar campos concretos (preparado para Fase 4 o 5).

---

## 7. Pendiente — Fases 4 y 5

### Fase 4 — Features de alto impacto (no iniciada)

| Feature | Descripción | Esfuerzo |
|---|---|---|
| **SLA / Semáforo en dashboard** | Solicitudes en `Enviada` > 2h en rojo; alerta al gestor | 2-3 días |
| **Full-Text Search indexado** | `ALTER TABLE solicitudes ADD FULLTEXT INDEX ft_referencia (referencia)` + columna virtual `nombre_cliente_idx` extraída de JSON | 1-2 días |
| **OCR + auto-prefill** | `extractRoutes.js` ya existe (OpenRouter). Mapear output al schema del ramo y pre-rellenar `NewRequest.tsx` | 2-3 días |
| **Ganchos de salida (Avant2, Foliume)** | `server/src/integrations/hooks.js` con `runOutboundHooks(event, payload)`, invocado desde el eventBus | 1-2 días |
| **Migrar OCR a Gemini directo** | Usar `@google/genai` (ya está en `package.json`) en lugar de OpenRouter | 1 día |

### Fase 5 — Backlog estratégico (no iniciada)

| Feature | Descripción | Esfuerzo |
|---|---|---|
| **TypeScript en backend** | Migración gradual con `tsx`/`tsc`. Empezar por `models/` y `utils/` | 1-2 semanas |
| **Runner de migraciones Node** | `node scripts/migrate.js` en lugar de correr SQL manual | 1-2 días |
| **BullMQ + Redis** | Cola de emails persistente (sobrevive a reinicios) | 1 semana |
| **Webhooks entrantes** | Avant2/Codeoscopic notificando cambios de estado | 1 semana |
| **Rate limiting por delegación** | `express-rate-limit` ya instalado; añadir middleware | 0.5 días |

---

## 8. Cómo trabajar con este código

### Arrancar en local

```bash
npm install
cp .env.example .env
# Editar .env con credenciales reales
npm run dev
```

El servidor aplica las migraciones automáticamente (excepto el `MODIFY` del ENUM) y arranca en `:3000`.

### Aplicar la migración manualmente

```bash
mysql -u <user> -p < migrations/001_quickwins_phase0.sql
```

Es **idempotente**: re-ejecutarlo no falla.

### Verificar el esquema en BD

```sql
-- Columnas nuevas
SHOW COLUMNS FROM usuarios WHERE Field IN ('rol', 'comision_pactada', 'delegacion_asignada_id');
SHOW COLUMNS FROM delegaciones WHERE Field = 'parent_delegacion_id';
SHOW COLUMNS FROM solicitudes WHERE Field IN ('contiene_lopd_sensible','fecha_purgado','capital_estimado','prima_estimada');
SHOW COLUMNS FROM comentarios WHERE Field = 'es_interno';

-- FKs nuevas
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME LIKE 'fk_%';
```

### Probar el eventBus y la cola

```bash
# Crear una solicitud y enviarla: debe cambiar a Enviada inmediatamente,
# el email se procesa en background
curl -X POST http://localhost:3000/api/solicitudes/4/enviar -H "Cookie: token=..."

# Ver el log del servidor:
# [emailHandler] Email de solicitud enviada despachado: ...
```

### Probar la validación Zod

```bash
# Email mal formado
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "no-es-email", "password": "x"}'
# → 400 con { message: "Payload invalido", errors: [{ path: "email", message: "Email invalido" }] }
```

### Probar el rol avisador

1. Como admin, ir a Configuración → crear usuario con rol `avisador`, asignar `delegacion_asignada_id`.
2. Logout, login con ese usuario. Redirige automáticamente a `/avisador`.
3. Crear aviso: se asigna automáticamente a la delegación configurada.
4. Logout, login con un gestor de esa delegación. Verá el aviso del avisador en su Dashboard.

---

## 9. Convenciones y decisiones

### Naming

- **Backend JS:** español en identificadores (`delegacion_origen_id`, `solicitudModel`, `crearSolicitud` se evita, se prefiere `create` para consistencia con HTTP verbs).
- **Frontend TS:** español también, pero tipos en inglés (`InsuranceRequest`, `RequestStatus`).
- **SQL:** columnas y tablas en snake_case en español (`delegacion_origen_id`, `historico_estados`).
- **Eventos:** lowercase dot.notation (`solicitud.enviada`, `solicitud.estadoCambiado`).

### Reglas de validación

- Toda mutación (`POST`, `PUT`, `PATCH`, `DELETE`) valida con Zod salvo que sea trivial.
- Errores devuelven `{ message, errors: [{ path, message }] }`.
- HTTP status: 400 para validación, 401/403 para auth, 404 para not found, 500 para errores internos.

### Manejo de errores

- `errorHandler.js` captura todo, loguea `stack` y responde JSON.
- Los `EventEmitter` listeners están envueltos en try/catch dentro de `emitAsync`.
- La cola loguea cada intento fallido con `[notificationQueue] <jobName> fallo intento N/3: <message>`.

### Transacciones

- `withTransaction(work)` es el ÚNICO patrón permitido. No abrir transactions a mano.
- Las funciones de modelo aceptan `connection` opcional para reusar la transacción.

### Roles y permisos

- Cualquier nueva ruta que toque `solicitudes` debe pasar por `ensureSolicitudAccess`.
- Nuevos roles se añaden al ENUM en `database.sql` y en el array `allowedRoles` de `userSchemas.js`.

---

## 10. Archivos clave (cheat-sheet)

| Quiero... | Archivo |
|---|---|
| Añadir un nuevo evento | `server/src/events/eventBus.js` (constante) + `server/src/events/handlers/*.js` (suscriptor) |
| Cambiar plantilla de email | `server/src/templates/emails/*.json` (campos) o `base.hbs` (layout) |
| Añadir un campo al formulario | `src/data/formSchemas.ts` o BD vía admin (auto-sincroniza). Si es requerido, añadir a schema dinámico. |
| Añadir un nuevo rol | `database.sql` (ENUM) + `server/src/schemas/userSchemas.js` (allowedRoles) + `src/context/AuthContext.tsx` (Role type) + `src/pages/Settings.tsx` (select) + `solicitudPermissions.js` (lógica) |
| Cambiar flujo de estados | `solicitudController.js:changeEstado` + `solicitudSchemas.js` |
| Añadir validación a un endpoint | Crear schema en `server/src/schemas/*.js` + `safeParse` en el controller |
| Cambiar la jerarquía de delegaciones | Asignar `parent_delegacion_id` en la tabla `delegaciones` (auto-detectado por la CTE) |
| Aplicar migración | `mysql ... < migrations/NNN_*.sql` o reiniciar el servidor (auto-repara lo aditivo) |
| Ver las queries lentas | Activar logging en `server/src/config/db.js` (añadir `debug: ['ComQueryPacket', ...]`) |

---

## 11. Riesgos conocidos

| Riesgo | Mitigación actual | Plan |
|---|---|---|
| Jobs en memoria se pierden al reiniciar | p-queue tolera reinicio (no es crítico para emails) | Migrar a BullMQ + Redis (Fase 5) |
| `MODIFY COLUMN` del ENUM puede fallar en hosting con permisos limitados | Script de migración manual | Auto-detectar y loguear warning |
| `KEY_COLUMN_USAGE` puede no estar accesible en algunos MySQL (no debería) | Ya validado en producción (`srv1425.hstgr.io`) | — |
| Email agota reintentos y queda silencioso | Log + consola del servidor | Panel de dead-letter (Fase 5) |
| Avisador sin `delegacion_asignada_id` puede crear aviso? | NO: bloqueado en controller con 400 | — |
| Frontend recibe payload de error con `path` pero no lo renderiza | Mostramos `message` general | UI de field-level errors (Fase 4 o 5) |

---

## 12. Changelog

- **Fase 0 (jun 2026):** pool 20, ACID, 6 migraciones, sync service.
- **Fase 1 (jun 2026):** EventBus, p-queue, Handlebars, email handler.
- **Fase 2 (jun 2026):** 6 roles, jerarquía, AvisadorDashboard, Settings ampliado.
- **Fase 3 (jun 2026):** validación Zod dinámica + schemas en todos los controllers.

---

## 13. Próximo paso sugerido

Retomar con **Fase 4: SLA / Semáforo + Full-Text Search**. Son cambios pequeños con retorno inmediato en UX y rendimiento. Después, evaluar si se quiere invertir en **Fase 5 (TypeScript en backend)** antes de empezar a integrar conectores externos (Avant2, Foliume).
