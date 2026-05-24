# Spec: Sistema de Gestión de Agendas Médicas

> Slug: `medical-agenda` · Modo de entrada: B · Generado: 2026-05-24

## Historia de usuario
Como **personal de la clínica (médico o recepcionista)**, quiero **gestionar la agenda de citas médicas de forma segura e impedir sobreposiciones horarias, así como registrar el historial de diagnósticos sensibles del paciente de manera estructurada y cifrada**, para **garantizar una atención médica eficiente sin colisiones y proteger estrictamente la confidencialidad de la información médica**.

## Alcance
### Incluye
- **Base de Datos PostgreSQL**:
  - Tablas normalizadas para `medicos`, `pacientes`, `citas` y `paciente_diagnosticos`.
  - Restricciones de integridad relacional (Foreign Keys), restricciones `CHECK` (horarios laborales, duración, fechas futuras) y restricciones `UNIQUE`.
  - Trigger `PL/pgSQL` en la tabla `citas` para bloquear de forma transaccional y atómica cualquier inserción o actualización que cause sobreposición horaria para un mismo médico.
  - Soporte de múltiples diagnósticos para un mismo paciente, cada uno vinculado a un médico específico, disciplina y fecha.
  - Tabla de auditoría de datos sensibles (`registro_auditoria_sensible`) para registrar lecturas/escrituras de diagnósticos de forma inmutable.
- **Backend (Node.js + Express + TypeScript)**:
  - Endpoints de autenticación y control de acceso basado en roles (RBAC).
  - Lógica para encriptar a nivel de columna (usando AES-256-GCM) los diagnósticos clínicos sensibles en la base de datos.
  - API REST para la gestión de citas y expedientes médicos.
- **Frontend (Vite + React + Vanilla CSS)**:
  - Interfaz moderna, premium y responsiva con vistas diferenciadas según el rol del usuario (Recepcionista vs. Médico).
  - Calendario interactivo de citas médicas con validación en tiempo real.
  - Sección para buscar pacientes y visualizar de forma segura su historial de diagnósticos estructurado por disciplina y médico (solo accesible a Médicos).

### NO incluye (out of scope)
- Pasarela de pago para cobro de consultas médicas.
- Videollamadas de telemedicina integradas.
- Recetas médicas electrónicas firmadas digitalmente con certificados externos.
- Sincronización bidireccional externa (Google Calendar, Microsoft Outlook).

## Actores
| Rol | Descripción | Permisos relevantes |
|---|---|---|
| **Administrativo / Recepcionista** | Gestiona el flujo diario de citas y pacientes de la clínica. | Registrar pacientes/médicos, crear, reprogramar y cancelar citas. NO puede ver ni crear diagnósticos médicos en el expediente sensible. |
| **Médico** | Profesional de la salud que atiende las consultas. | Ver su propia agenda de citas, buscar pacientes, registrar y consultar el historial de diagnósticos sensibles (todas las disciplinas). |
| **Paciente** | Cliente que recibe la atención. | Ver únicamente su propio historial de citas agendadas a través de su ID único (no accede al portal interno). |

## Precondiciones
- El médico debe estar registrado en el sistema con su nombre, especialidad/disciplina y un ID único.
- El paciente debe estar registrado en el sistema con sus datos de contacto generales, número de identificación y un ID único (`paciente_id`).

## Postcondiciones
- Toda cita nueva o modificada se almacena en la base de datos garantizando que el médico asignado no tiene otro compromiso en esa misma franja de tiempo.
- Cualquier diagnóstico clínico redactado por un médico queda almacenado encriptado en reposo, y se genera un registro automático de auditoría con la identidad de quien lo creó.

## Flujo principal (caso feliz)
1. **Creación de Cita**: El Administrativo selecciona un paciente, un médico y una franja horaria disponible (ej: Lunes 10:00 - 10:30).
2. El sistema valida las restricciones básicas en el backend (fecha futura, horario laboral 08:00 a 20:00).
3. Se ejecuta la inserción en la tabla `citas`. El trigger `PL/pgSQL` comprueba que el médico no tenga traslapes. Al estar libre, la inserción se completa con éxito.
4. **Registro de Diagnóstico**: Durante la cita, el Médico accede al perfil del paciente mediante su ID único y añade un nuevo diagnóstico detallando la disciplina (ej. Cardiología), notas clínicas y tratamiento.
5. El backend recibe los datos del diagnóstico, los cifra usando AES-256-GCM y los inserta en `paciente_diagnosticos`.
6. Se genera un registro automático en `registro_auditoria_sensible` indicando la acción, médico, paciente e hito temporal.

## Flujos alternativos
### Alt-1: Intento de Cita Solapada
1. El Administrativo intenta registrar una cita para el Médico A de 10:15 a 10:45, pero el Médico A ya tiene una cita de 10:00 a 10:30.
2. Al insertar en la base de datos, el trigger `PL/pgSQL` detecta que el intervalo se intersecta con la cita existente.
3. El trigger aborta la transacción lanzando un error SQLSTATE `45000` con el mensaje: `Error: El médico ya tiene una cita programada que se solapa con este horario.`
4. El backend intercepta la excepción, revierte cualquier cambio y devuelve un código de estado `409 Conflict` a la interfaz de usuario con un mensaje amigable.

### Alt-2: Recepcionista intenta ver Diagnósticos Sensibles
1. El Administrativo intenta acceder al endpoint de historial de diagnósticos de un paciente.
2. El middleware de autorización del backend verifica el token JWT y detecta que el rol es `Recepcionista`.
3. El backend rechaza la solicitud de forma inmediata devolviendo un código `403 Forbidden` y registra una alerta de seguridad por intento de acceso no autorizado.

## Reglas de negocio
- **RB-1 (Validación de Tiempos)**: La fecha y hora de inicio de una cita debe ser estrictamente en el futuro y la fecha/hora de fin debe ser posterior a la de inicio (`fecha_hora_fin > fecha_hora_inicio`).
- **RB-2 (Horario Laboral)**: Las citas solo se pueden agendar en días de lunes a viernes en el horario de 08:00 a 20:00 (las horas de inicio y fin de la cita deben estar comprendidas en este rango).
- **RB-3 (Prevención de Solapamiento)**: Para un mismo `medico_id`, no pueden existir dos registros de citas cuyas franjas temporales `[fecha_hora_inicio, fecha_hora_fin)` se traslapen (es decir, la intersección de los intervalos debe ser vacía).
- **RB-4 (Especificidad del Paciente)**: El paciente debe estar identificado en la base de datos por un UUID único (`paciente_id`). Un paciente puede tener cero, uno o múltiples diagnósticos históricos.
- **RB-5 (Auditoría Obligatoria)**: Cualquier consulta SELECT, INSERT, UPDATE o DELETE sobre la tabla de diagnósticos médicos debe crear una fila en `registro_auditoria_sensible` con el ID del usuario, fecha, acción y paciente consultado.
- **RB-6 (Cifrado Obligatorio)**: Las columnas de `diagnostico` y `notas_clinicas` deben ser encriptadas en reposo antes de almacenarse en la base de datos PostgreSQL, utilizando una clave simétrica robusta gestionada de manera segura por el backend.

## Escenarios BDD (Gherkin)

### Escenario 1: Agendamiento exitoso de una cita médica
Given que el médico "Dr. Juan Pérez" no tiene citas programadas para el "2026-06-01" entre las "10:00" y las "11:00"
And que el paciente "María Gómez" está debidamente registrado con su ID único
When el administrativo intenta agendar una cita para "María Gómez" con el "Dr. Juan Pérez" desde las "10:00" hasta las "10:30" el "2026-06-01"
Then el sistema debe guardar la cita en la base de datos
And devolver una confirmación de éxito de forma inmediata.

### Escenario 2: Bloqueo de cita que se solapa al inicio de otra
Given que el médico "Dr. Juan Pérez" tiene una cita agendada de "10:00" a "10:30" el "2026-06-01"
When el administrativo intenta agendar una nueva cita con el "Dr. Juan Pérez" de "10:15" a "10:45" el mismo día
Then la base de datos debe rechazar la inserción mediante el trigger PL/pgSQL
And el backend debe responder con un error "409 Conflict" indicando que el horario está ocupado.

### Escenario 3: Consulta segura de expediente clínico sensible
Given que el usuario "Dr. Carlos Ruiz" está autenticado en el sistema con el rol "Medico"
And que el paciente "María Gómez" tiene tres diagnósticos de cardiología y pediatría registrados
When el "Dr. Carlos Ruiz" solicita visualizar el historial médico de "María Gómez"
Then el sistema debe descifrar los diagnósticos en el backend
And devolver el historial estructurado de diagnósticos ordenados por fecha
And insertar un registro de auditoría inmutable en "registro_auditoria_sensible".

## Criterios de aceptación
- [ ] La base de datos PostgreSQL implementa restricciones UNIQUE y CHECK para validar la consistencia temporal básica de las citas.
- [ ] Se implementa y verifica un trigger PL/pgSQL que evita de forma infalible la sobreposición de citas de un mismo médico.
- [ ] La base de datos tiene una tabla `paciente_diagnosticos` donde cada diagnóstico tiene un ID único, se vincula a un paciente, a un médico, posee una columna de disciplina y campos cifrados para el diagnóstico.
- [ ] Los campos sensibles de diagnóstico se guardan cifrados (con AES-256-GCM) en PostgreSQL de forma que sean indescifrables sin la clave del backend.
- [ ] El backend implementa middleware de roles (RBAC) impidiendo que usuarios administrativos lean o escriban diagnósticos sensibles.
- [ ] Cada consulta a datos sensibles genera un registro automático en una tabla de auditoría inmutable.
- [ ] La aplicación web frontend expone una UI de alta fidelidad, interactiva y limpia para que las recepcionistas gestionen citas y los médicos consulten y agreguen diagnósticos.

## Métricas de éxito
- **Seguridad**: 100% de los diagnósticos sensibles se almacenan encriptados y cada consulta es registrada en la auditoría.
- **Integridad**: 0% de citas solapadas permitidas bajo concurrencia extrema.
- **Latencia**: Búsqueda de citas y agenda del día se carga en < 150ms.

## Preguntas abiertas (TBD)
- Ninguna. Las asunciones y decisiones de estructura estructurada y paciente único se han validado y aprobado.
