# Tasks: Sistema de Gestión de Agendas Médicas (ClinicalFlow)

> Slug: `medical-agenda` · Generado: 2026-05-24 · Basado en: [plan.md](file:///C:/Users/marin/OneDrive/Documents/Workspace/projects/ClinicalFlow/specs/medical-agenda/plan.md)
> Total de tareas: 15 · Esfuerzo estimado: 24.5 horas

## Convenciones
- Estado: `pending` | `in_progress` | `done` | `blocked` | `skipped`
- Esfuerzo: en horas (0.5, 1, 2, 4)
- Dependencias: lista de IDs T-NNN que deben completarse antes

---

## T-001 — Configuración e Infraestructura Local (Docker)

- **Estado:** pending
- **Esfuerzo:** 1.5h
- **Depende de:** ninguna
- **Archivos esperados:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `.env.example`
- **Criterio de done:**
  - `docker-compose config` compila y valida la sintaxis sin errores.
  - Los contenedores se orquestan correctamente e inicializan una instancia limpia de PostgreSQL 15, Node y React.

---

## T-002 — Base de Datos: Schema DDL (camelCase & Triggers)

- **Estado:** pending
- **Esfuerzo:** 2h
- **Depende de:** T-001
- **Archivos esperados:** `backend/src/database/schema.sql`
- **Criterio de done:**
  - El DDL corre completo en la base de datos levantada de Docker sin fallos de sintaxis o llaves foráneas.
  - Las 10 tablas camelCase en inglés con sus CHECK y UNIQUE constraints se crean con éxito.
  - Los triggers PL/pgSQL de sobreposición de citas (`trg_prevent_appointment_overlap`), médico único primario (`trg_enforce_single_primary_doctor`) y validación de rol de médico (`trg_validate_appointment_doctor`) quedan instalados.

---

## T-003 — Base de Datos: Script de Semillas (Seed Data)

- **Estado:** pending
- **Esfuerzo:** 1h
- **Depende de:** T-002
- **Archivos esperados:** `backend/src/database/seed.sql`
- **Criterio de done:**
  - El script se inserta completamente sobre el esquema de base de datos.
  - Contiene al menos un Súper Administrador, dos médicos con especialidad, tres pacientes, dos enfermeras, un administrativo y un empleado de mantenimiento.
  - Todas las contraseñas asociadas están pre-hasheadas con bcrypt para permitir logins inmediatos.

---

## T-004 — Utilidad de Encriptación (AES-256-GCM)

- **Estado:** pending
- **Esfuerzo:** 1h
- **Depende de:** T-001
- **Archivos esperados:** `backend/src/utils/crypto.ts`
- **Criterio de done:**
  - Provee las funciones `encrypt(text)` y `decrypt(cipherText)` funcionando con AES-256-GCM y usando una clave secreta del `.env`.
  - El descifrado recupera exactamente el texto original e incluye validaciones para textos inválidos o alterados.

---

## T-005 — Middleware de Autenticación y Sesiones Activas

- **Estado:** pending
- **Esfuerzo:** 2h
- **Depende de:** T-003, T-004
- **Archivos esperados:** `backend/src/middlewares/auth.middleware.ts`
- **Criterio de done:**
  - Valida el token JWT enviado en las Cookies y extrae la sesión.
  - Consulta en `"activeSessions"` en tiempo real que la sesión (`tokenJti`) no haya sido desactivada por el Admin (`isActive = TRUE`). Si está inactiva, bloquea el paso y retorna `401 Unauthorized`.

---

## T-006 — Middleware de Auditoría (Reason Validation)

- **Estado:** pending
- **Esfuerzo:** 1h
- **Depende de:** T-005
- **Archivos esperados:** `backend/src/middlewares/audit.middleware.ts`
- **Criterio de done:**
  - Intercepta todas las peticiones `PUT`, `PATCH` y `DELETE` sobre recursos sensibles.
  - Valida que exista el string `reason` en el cuerpo del mensaje y que tenga mínimo 10 caracteres. Si no, retorna `400 Bad Request`.

---

## T-007 — API: Módulo de Autenticación (Auth routes & controller)

- **Estado:** pending
- **Esfuerzo:** 1.5h
- **Depende de:** T-005
- **Archivos esperados:** `backend/src/controllers/auth.controller.ts`, `backend/src/routes/auth.routes.ts`
- **Criterio de done:**
  - `/api/auth/login` valida credenciales contra `"users"`, genera un UUID `tokenJti`, inserta el registro en `"activeSessions"`, y retorna el JWT en cookie HTTP-Only.
  - `/api/auth/logout` invalida la sesión (`isActive = FALSE`) en la base de datos y borra la cookie del navegador.

---

## T-008 — API: Gestión de Citas (Appointments routes & controller)

- **Estado:** pending
- **Esfuerzo:** 2h
- **Depende de:** T-006, T-007
- **Archivos esperados:** `backend/src/controllers/appointment.controller.ts`, `backend/src/routes/appointment.routes.ts`
- **Criterio de done:**
  - Permite crear citas capturando errores del trigger de sobreposición y devolviendo `409 Conflict` legible.
  - Implementa edición (`PUT`) y cancelación (`DELETE`) vinculadas a transacciones SQL que escriben los valores anteriores, nuevos y la justificación en la tabla `"systemChangeLogs"`.

---

## T-009 — API: Expediente Clínico Cifrado (Diagnoses routes & controller)

- **Estado:** pending
- **Esfuerzo:** 2h
- **Depende de:** T-004, T-006, T-007
- **Archivos esperados:** `backend/src/controllers/diagnosis.controller.ts`, `backend/src/routes/diagnosis.routes.ts`
- **Criterio de done:**
  - El endpoint de creación cifra el diagnóstico y las notas en el backend antes de guardar.
  - El endpoint de consulta descifra los campos clínicos antes de retornarlos, valida que el solicitante sea un Médico, y registra de manera obligatoria la consulta en `"sensitiveAuditLogs"`.

---

## T-010 — API: Utilidades de Súper Administrador (Backups & Sessions routes)

- **Estado:** pending
- **Esfuerzo:** 2.5h
- **Depende de:** T-007
- **Archivos esperados:** `backend/src/controllers/admin.controller.ts`, `backend/src/routes/admin.routes.ts`
- **Criterio de done:**
  - `/api/admin/sessions` lista todas las sesiones activas en tiempo real.
  - `/api/admin/sessions/:id/revoke` actualiza `isActive = FALSE` para desloguear a ese usuario instantáneamente.
  - `/api/admin/backups` ejecuta `pg_dump` mediante un proceso hijo seguro de Node y crea un archivo comprimido de base de datos `.sql` en el volumen local.

---

## T-011 — UI: Diseño de Estilos Premium (Vanilla CSS)

- **Estado:** done
- **Esfuerzo:** 2h
- **Depende de:** T-001
- **Archivos esperados:** `frontend/src/styles/index.css`
- **Criterio de done:**
  - Define variables de paleta CSS sofisticadas, tipografía moderna, sombras suaves, y efectos de micro-interacción.
  - Incluye clases para paneles responsivos, layouts de agenda, indicadores de estado de citas y modales glassmorphic.

---

## T-012 — UI: Autenticación, Ruteo y Sidebar

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-011
- **Archivos esperados:** `frontend/src/App.tsx`, `frontend/src/views/Login.tsx`, `frontend/src/components/Sidebar.tsx`
- **Criterio de done:**
  - Implementa el ruteo seguro para redirigir a los usuarios a sus respectivos tableros (Admin, Medico, Paciente).
  - El Sidebar adapta sus botones y accesos dinámicamente según el rol.

---

## T-013 — UI: Portales de Citas (Pacientes y Médicos)

- **Estado:** done
- **Esfuerzo:** 2h
- **Depende de:** T-012
- **Archivos esperados:** `frontend/src/views/PatientDashboard.tsx`, `frontend/src/views/DoctorDashboard.tsx`
- **Criterio de done:**
  - El Paciente puede ver sus citas agendadas y cancelarlas (desplegando el Modal obligando a escribir la justificación).
  - El Médico visualiza su agenda diaria e incorpora un buscador interactivo de pacientes con su historial de diagnósticos cifrados (que se descifran en pantalla al ser consultados).

---

## T-014 — UI: Consola del Administrador (Sesiones y Respaldos)

- **Estado:** done
- **Esfuerzo:** 2h
- **Depende de:** T-012
- **Archivos esperados:** `frontend/src/views/AdminDashboard.tsx`
- **Criterio de done:**
  - Carga la lista de sesiones activas en tiempo real con opción a desconectarlas con un botón.
  - Permite presionar "Generate Database Backup" y muestra un historial de copias de seguridad con botones para descargarlas en el acto.
  - Panel para administrar empleados (agregar, editar salarios, ver nómina y agregar notas/documentos PDF).

---

## T-015 — Tests de Integración Automáticos y Validación Final

- **Estado:** pending
- **Esfuerzo:** 2h
- **Depende de:** T-008, T-009, T-010
- **Archivos esperados:** `backend/tests/integration.test.ts`
- **Criterio de done:**
  - El comando `npm run test:integration` corre la suite de pruebas levantando una base de datos PostgreSQL de test en Docker.
  - El 100% de los tests pasan con éxito (colisiones del trigger, justificación requerida de edición, bloqueo de sesión revocada).

---

## Resumen

| Bloque | Tareas | Esfuerzo |
|---|---|---|
| Fundación | T-001 | 1.5h |
| Modelo de datos | T-002, T-003 | 3h |
| Utilidades y Seguridad | T-004 | 1h |
| Middlewares | T-005, T-006 | 3h |
| APIs Core | T-007, T-008, T-009, T-010 | 8h |
| Diseño de UI | T-011 | 2h |
| Desarrollo UI | T-012, T-013, T-014 | 5.5h |
| Pruebas de Integración | T-015 | 2h |
| **TOTAL** | 15 tareas | **26h** |

## Ruta crítica
T-001 → T-002 → T-004 → T-005 → T-007 → T-008 → T-012 → T-013 → T-014 → T-015

## Tareas paralelizables
- La UI (T-011) puede arrancar en paralelo tan pronto como se configure Docker (T-001).
- El cifrado (T-004) puede codificarse mientras se configuran las semillas (T-003).

## Próximo paso
Iniciar la ejecución de **T-001** (Configuración e Infraestructura Local con Docker).
