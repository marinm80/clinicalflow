# Plan: Sistema de Gestión de Agendas Médicas (ClinicalFlow)

> Slug: `medical-agenda` · Generado: 2026-05-24 · Basado en: [spec.md](file:///C:/Users/marin/OneDrive/Documents/Workspace/projects/ClinicalFlow/specs/medical-agenda/spec.md), [tech-spec.md](file:///C:/Users/marin/OneDrive/Documents/Workspace/projects/ClinicalFlow/specs/medical-agenda/tech-spec.md)
> **ESTE DOCUMENTO REQUIERE REVISIÓN HUMANA ANTES DE PASAR A TASK-DECOMPOSER**

## Resumen ejecutivo
Se desarrollará una aplicación web médica full-stack robusta y elegante de una sola instalación (single-tenant) en la carpeta del espacio de trabajo. El backend estará construido en **Node.js + Express con TypeScript**, interactuando con **PostgreSQL 15** mediante SQL directo y un cliente nativo (para control absoluto de triggers y bloqueos transaccionales). El frontend será una SPA moderna e interactiva desarrollada con **Vite + React (TypeScript)** y estilizada con CSS Vanilla de altísima fidelidad. La aplicación estará containerizada mediante **Docker Compose** para orquestar la API, el Frontend y la base de datos PostgreSQL en un entorno de desarrollo/producción idéntico y aislado.

## Stack final
- **Frontend**: Vite, React (TypeScript), CSS Vanilla, Lucide React (iconos), React Router (navegación).
- **Backend**: Node.js, Express (TypeScript), `pg` (cliente nativo PostgreSQL), `jsonwebtoken` (JWT), `bcryptjs` (hashing), `dotenv`.
- **Base de Datos**: PostgreSQL 15 running in Docker.
- **Auditoría y Seguridad**: Cifrado simétrico local AES-256-GCM en el backend.
- **Entorno**: Docker, Docker Compose, Docker Volumes (para persistencia de base de datos y archivos de respaldo `.sql`).

---

## Decisiones arquitectónicas (ADRs)

### D-01: Convención de Base de Datos camelCase y Cifrado
- **Contexto**: PostgreSQL por defecto convierte todos los nombres de tablas a minúsculas, a menos que se usen comillas dobles.
- **Decisión**: Crearemos todas las tablas usando camelCase dentro de comillas dobles en DDL (ej. `CREATE TABLE "patientDoctors" ...`). Las consultas SQL en el backend referenciarán siempre las tablas con comillas dobles.
- **Cifrado**: El cifrado de diagnósticos clínicos sensibles se realizará a nivel de aplicación (backend) mediante la librería nativa de Node `crypto` con el algoritmo `aes-256-gcm`. La base de datos almacenará el resultado en base de datos como campos `TEXT` (`encrypted_diagnosis`, `encrypted_clinical_notes`).

### D-02: Gestión de Sesiones Activas
- **Contexto**: Se requiere permitir al Admin desconectar a usuarios conectados. Los JWT tradicionales son apátridas (stateless) y no se pueden revocar hasta que expiren.
- **Decisión**: Añadir una tabla `"activeSessions"` en la base de datos. Cada vez que un usuario inicia sesión, se genera un UUID único (`token_jti`) y se inserta en `"activeSessions"` con `is_active = TRUE`. El JWT contendrá este `token_jti`. El middleware de Express comprobará en cada petición que el `token_jti` siga activo. El Admin puede revocar la sesión poniendo `is_active = FALSE`.

### D-03: Auditoría Obligatoria de Ediciones y Eliminaciones
- **Contexto**: Cualquier modificación o borrado de información debe registrar obligatoriamente una razón explicativa.
- **Decisión**: Se implementará un middleware global en Express que obligará a que toda petición `PUT`, `PATCH` y `DELETE` incluya un string `reason` en el cuerpo del request. Si falta o es menor a 10 caracteres, se rechazará con `400 Bad Request`.
- **Transaccionalidad**: El backend ejecutará la inserción en la tabla `"systemChangeLogs"` y el cambio de base de datos dentro de una misma **transacción SQL** (`BEGIN ... COMMIT`). Si una falla, toda la transacción se revierte.

### D-04: Gestión de Respaldos
- **Contexto**: El Súper Administrador debe poder descargar y crear respaldos de base de datos desde la UI.
- **Decisión**: El contenedor del backend tendrá instalado el cliente de PostgreSQL (`postgresql-client`) y montará un volumen compartido `/backups`. El endpoint `/api/admin/backups` ejecutará mediante `exec` de Node el comando nativo `pg_dump` sobre la base de datos de Docker, guardando un archivo comprimido `.sql` y permitiendo su descarga o listado.

---

## Modelo de Datos (camelCase & English Structure)

### Tablas a crear en PostgreSQL:

1. **`"users"`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `email`: `VARCHAR(100) UNIQUE NOT NULL`
   - `passwordHash`: `VARCHAR(255) NOT NULL`
   - `userType`: `VARCHAR(20) NOT NULL CHECK (userType IN ('patient', 'doctor', 'employee', 'admin'))`
   - `patientId`: `UUID REFERENCES "patients"(id) ON DELETE CASCADE NULL`
   - `doctorId`: `UUID REFERENCES "doctors"(id) ON DELETE CASCADE NULL`
   - `employeeId`: `UUID REFERENCES "employees"(id) ON DELETE CASCADE NULL`
   - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

2. **`"doctors"`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `firstName`: `VARCHAR(50) NOT NULL`
   - `lastName`: `VARCHAR(50) NOT NULL`
   - `displayName`: `VARCHAR(101) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED` (Note: in PG, columns inside generated as are internal)
   - `email`: `VARCHAR(100) UNIQUE NOT NULL`
   - `discipline`: `VARCHAR(100) NOT NULL`
   - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

3. **`"patients"`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `firstName`: `VARCHAR(50) NOT NULL`
   - `lastName`: `VARCHAR(50) NOT NULL`
   - `displayName`: `VARCHAR(101) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED`
   - `identityNumber`: `VARCHAR(50) UNIQUE NOT NULL`
   - `email`: `VARCHAR(100) UNIQUE NOT NULL`
   - `phone`: `VARCHAR(20) NOT NULL`
   - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

4. **`"patientDoctors"`** (Relación muchos a muchos: Médico Primario + Especialistas)
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `patientId`: `UUID NOT NULL REFERENCES "patients"(id) ON DELETE CASCADE`
   - `doctorId`: `UUID NOT NULL REFERENCES "doctors"(id) ON DELETE CASCADE`
   - `relationshipType`: `VARCHAR(30) NOT NULL CHECK (relationshipType IN ('primary', 'specialist'))`
   - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - *Constraint*: `UNIQUE (patientId, doctorId)`

5. **`"employees"`** (Personal clínico: enfermeras, mantenimiento, administradores)
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `firstName`: `VARCHAR(50) NOT NULL`
   - `lastName`: `VARCHAR(50) NOT NULL`
   - `displayName`: `VARCHAR(101) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED`
   - `email`: `VARCHAR(100) UNIQUE NOT NULL`
   - `phone`: `VARCHAR(20) NOT NULL`
   - `department`: `VARCHAR(50) NOT NULL`
   - `clinicRole`: `VARCHAR(30) NOT NULL CHECK (clinicRole IN ('administrative', 'nurse', 'maintenance', 'executive'))`
   - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

6. **`"activeSessions"`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `userId`: `UUID NOT NULL REFERENCES "users"(id) ON DELETE CASCADE`
   - `tokenJti`: `UUID NOT NULL UNIQUE`
   - `ipAddress`: `VARCHAR(45) NULL`
   - `userAgent`: `TEXT NULL`
   - `isActive`: `BOOLEAN NOT NULL DEFAULT TRUE`
   - `loginAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `expiresAt`: `TIMESTAMP WITH TIME ZONE NOT NULL`

7. **`"appointments"`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `doctorId`: `UUID NOT NULL REFERENCES "doctors"(id) ON DELETE CASCADE`
   - `patientId`: `UUID NOT NULL REFERENCES "patients"(id) ON DELETE CASCADE`
   - `startTime`: `TIMESTAMP WITH TIME ZONE NOT NULL`
   - `endTime`: `TIMESTAMP WITH TIME ZONE NOT NULL`
   - `reason`: `VARCHAR(255) NOT NULL`
   - `status`: `VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled'))`
   - `cancelledBy`: `VARCHAR(30) NULL CHECK (cancelledBy IN ('patient', 'doctor', 'nurse', 'administrative'))`
   - `cancellationReason`: `TEXT NULL`
   - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

8. **`"patientDiagnoses"`** (Diagnósticos Sensibles Cifrados)
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `patientId`: `UUID NOT NULL REFERENCES "patients"(id) ON DELETE CASCADE`
   - `doctorId`: `UUID NOT NULL REFERENCES "doctors"(id) ON DELETE RESTRICT`
   - `discipline`: `VARCHAR(100) NOT NULL`
   - `encryptedDiagnosis`: `TEXT NOT NULL`
   - `encryptedClinicalNotes`: `TEXT NOT NULL`
   - `diagnosisDate`: `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`

9. **`"sensitiveAuditLogs"`** (Log inmutable de auditoría para PHI)
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `userId`: `UUID NOT NULL REFERENCES "users"(id) ON DELETE RESTRICT`
   - `patientId`: `UUID NOT NULL REFERENCES "patients"(id) ON DELETE RESTRICT`
   - `action`: `VARCHAR(50) NOT NULL`
   - `timestamp`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `details`: `TEXT NULL`

10. **`"systemChangeLogs"`** (Historial de ediciones y eliminaciones con razón obligatoria)
    - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `affectedTable`: `VARCHAR(50) NOT NULL`
    - `recordId`: `UUID NOT NULL`
    - `userId`: `UUID NOT NULL REFERENCES "users"(id) ON DELETE RESTRICT`
    - `operationType`: `VARCHAR(10) NOT NULL CHECK (operationType IN ('UPDATE', 'DELETE'))`
    - `oldValues`: `JSONB NOT NULL`
    - `newValues`: `JSONB NULL`
    - `reason`: `TEXT NOT NULL`
    - `createdAt`: `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

---

## Contratos de API (Endpoints Clave)

### Autenticación (`/api/auth`)
- `POST /api/auth/login`: Inicia sesión, genera sesión en `"activeSessions"`, retorna JWT en Cookie HTTP-Only.
- `POST /api/auth/logout`: Invalida la sesión actual en la base de datos (`isActive = FALSE`).

### Citas (`/api/appointments`)
- `GET /api/appointments`: Obtiene citas según rol (Médicos ven sus citas, Administrativos/Enfermeras ven todo, Pacientes ven las suyas).
- `POST /api/appointments`: Crea una nueva cita. Valida sobreposiciones mediante trigger de BD.
- `PUT /api/appointments/:id`: Modifica una cita (Requiere `reason` en el body; loguea en `"systemChangeLogs"`).
- `DELETE /api/appointments/:id`: Cancela/Elimina una cita (Requiere `reason` y `cancelledBy` en el body).

### Expedientes Clínicos (`/api/diagnoses`)
- `GET /api/diagnoses/patient/:patientId`: Médicos obtienen el historial clínico. Descifra en memoria los campos. Registra consulta en `"sensitiveAuditLogs"`.
- `POST /api/diagnoses`: Registra un diagnóstico cifrándolo.

### Administración (`/api/admin`)
- `GET /api/admin/sessions`: Obtiene lista de sesiones activas (`isActive = TRUE`).
- `POST /api/admin/sessions/:id/revoke`: Desconecta inmediatamente una sesión activa (`isActive = FALSE`).
- `POST /api/admin/change-password`: Cambia contraseña de cualquier usuario.
- `POST /api/admin/backups`: Genera un backup de base de datos ejecutando `pg_dump`.
- `GET /api/admin/backups`: Lista backups disponibles en el servidor.
- `GET /api/admin/backups/:filename/download`: Descarga archivo de respaldo SQL.

---

## Estructura de carpetas resultante
El workspace quedará organizado de la siguiente manera:
```
ClinicalFlow/
├── docker-compose.yml
├── .env.example
├── specs/
│   └── medical-agenda/
│       ├── spec.md
│       ├── tech-spec.md
│       └── plan.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── config/
│   │   │   └── db.ts             # Conexión pg nativa
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts  # Verificación JWT + activeSessions
│   │   │   └── audit.middleware.ts # Enforzar el reason en PUT/DELETE
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── appointment.controller.ts
│   │   │   ├── diagnosis.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── database/
│   │   │   ├── schema.sql        # Definición DDL, Constraints y Triggers PL/pgSQL
│   │   │   └── seed.sql          # Usuarios de prueba y datos iniciales
│   │   └── utils/
│   │       └── crypto.ts         # Cifrado AES-256-GCM
│   └── tests/
│       └── integration.test.ts   # Suite de tests automáticos de integración
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/           # Componentes premium reutilizables
    │   │   ├── Sidebar.tsx
    │   │   ├── CalendarView.tsx
    │   │   ├── AuditModal.tsx    # Modal interactivo obligatorio de justificación
    │   │   └── Header.tsx
    │   ├── views/                # Pantallas específicas
    │   │   ├── Login.tsx
    │   │   ├── PatientDashboard.tsx
    │   │   ├── DoctorDashboard.tsx
    │   │   └── AdminDashboard.tsx# Gestión de backups y revocación de sesiones
    │   └── styles/
    │       └── index.css         # Diseño premium con CSS Vanilla
```

---

## Estrategia de testing
- **Tests de Integración**: Un archivo `backend/tests/integration.test.ts` levantará una conexión a PostgreSQL y ejecutará:
  1. Login de prueba y verificación de registro en `"activeSessions"`.
  2. Inserción de una cita exitosa.
  3. Inserción de una segunda cita del mismo médico en la misma hora, **validando que el trigger arroje el error SQLSTATE 45000**.
  4. Envío de petición `PUT` sin justificación y validando el código `400 Bad Request`.
  5. Cifrado y descifrado de un diagnóstico y validación de inserción en `"sensitiveAuditLogs"`.

## Despliegue
- La aplicación se levanta con `docker-compose up --build`.
- Los volúmenes montados mantendrán la base de datos de PostgreSQL persistente y las descargas de respaldos intactas en la carpeta local `/backups`.

---

## Estimación gruesa
- **Esfuerzo total estimado**: 24 horas
- **Granularidad esperada**: ~15 tareas atómicas (T-01 a T-15)

## Próximo paso
Una vez que el usuario apruebe este plan arquitectónico definitivo, se procederá a:
1. Generar el `implementation_plan.md` en los artefactos del agente.
2. Generar el `tasks.md` atómico.
3. Iniciar la codificación de las bases del proyecto.
