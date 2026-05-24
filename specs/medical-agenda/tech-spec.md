# Tech Spec: Sistema de Gestión de Agendas Médicas

> Slug: `medical-agenda` · Generado: 2026-05-24 · Spec funcional: [spec.md](file:///C:/Users/marin/OneDrive/Documents/Workspace/projects/ClinicalFlow/specs/medical-agenda/spec.md)

## NFRs

### Performance
- **Latencia objetivo**: p95 < 200ms para consultas de la agenda diaria, inserción de citas y registro de diagnósticos.
- **Throughput esperado**: Hasta 50 req/s concurrentes (adecuado para una clínica mediana/grande).
- **Picos conocidos**: Búsqueda matutina de agenda y fin de turno médico.

### Disponibilidad
- **Uptime objetivo**: 99.9% (sistema crítico para el funcionamiento de la clínica).
- **Multi-región**: No requerido (despliegue en servidor centralizado o entorno de contenedor único).
- **DR (Disaster Recovery)**: RPO = 1 hora (respaldos por hora de la BD de PostgreSQL), RTO = 4 horas.

### Compliance
- **Regulaciones aplicables**: Alineación con HIPAA / GDPR en el manejo de PHI (Protected Health Information).
- **Retención de datos**: Historial médico guardado por 5 años (configurable por normativas de salud locales).
- **Derecho al olvido**: No aplica a registros de salud históricos por ley de conservación de historiales médicos, pero sí para datos generales PII de contacto si el paciente es dado de baja y no posee historial de consultas.

### Deployment
- **Target**: Entorno local/producción containerizado.
- **Containerizado**: Sí, uso obligatorio de Docker y `docker-compose` para orquestar la aplicación (Servicio Web Frontend/Backend + Base de Datos PostgreSQL).
- **IaC**: Docker Compose (`docker-compose.yml`) como definición de infraestructura local.

### Observabilidad
- **Logs**: Logging estructurado en formato JSON en el backend (ej: Winston o Pino) con niveles de severidad (`info`, `warn`, `error`).
- **Audit Logs**: Registro estricto en la tabla `registro_auditoria_sensible` de todas las consultas o modificaciones de diagnósticos, persistidos de manera inmutable.
- **Métricas**: Indicadores básicos de salud del sistema expuestos en un endpoint `/health`.

### Testing
- **Niveles**:
  - Tests unitarios para la lógica de cifrado/descifrado y lógica de negocio.
  - Tests de integración automáticos (con Vitest o Jest) que levanten una base de datos PostgreSQL de prueba en Docker y verifiquen:
    1. Que las citas normales se agenden correctamente.
    2. Que el trigger PL/pgSQL aborte transacciones cuando existan sobreposiciones (incluyendo simulaciones concurrentes).
- **Cobertura mínima**: 80% en lógica de negocio, controladores y triggers.

### i18n / a11y
- **Idiomas**: Soporte inicial en Español.
- **WCAG**: Nivel AA para la interfaz de usuario web.

### Cache
- **App cache**: No requerida para datos clínicos sensibles para evitar inconsistencias de tiempo real o fugas de datos en memoria intermedia.
- **Cache de BD**: Índices bien planificados sobre `fecha_hora_inicio`, `fecha_hora_fin` y `medico_id` para acelerar búsquedas de colisiones directas.

### Auth
- **Mecanismo**: Autenticación local mediante correo/contraseña. Contraseñas hasheadas en backend con `bcrypt` (10-12 rondas de sal).
- **Sesiones**: Tokens JWT (JSON Web Tokens) firmados en el backend con una clave secreta fuerte simétrica de rotación rápida. Almacenados en cookies seguras HTTP-only en el frontend.
- **MFA**: No requerido para MVP local, pero previsto en la arquitectura.
- **Modelo de autorización**: Control de acceso basado en roles (RBAC) (Admin/Recepcionista vs. Médico) a nivel de middleware en Express/Node.js.

### Multi-tenant
- **Modelo**: Single-tenant (una instancia e instalación física por clínica).

### Seguridad de datos
- **Encriptación at-rest**: Los campos altamente sensibles de la base de datos (`diagnostico`, `notas_clinicas` en la tabla `paciente_diagnosticos`) se almacenarán cifrados con cifrado simétrico AES-256-GCM. La clave de cifrado se gestionará en el servidor backend mediante variables de entorno seguras (`CLINICAL_ENCRYPTION_KEY`).
- **Encriptación in-transit**: HTTPS obligatorio para todas las comunicaciones entre cliente y servidor.
- **Secret management**: Archivo `.env` local para desarrollo y secrets del motor de orquestación de contenedores para producción.
- **PII / PHI identificada**: Campos de diagnóstico y notas clínicas del paciente son PHI de alta criticidad.

---

## Restricciones explícitas (lo que NO se puede usar)
- **No ORM pesado para operaciones críticas de base de datos**: Para asegurar que el trigger PL/pgSQL y las consultas de concurrencia se ejecuten sin abstracciones misteriosas, usaremos SQL directo (mediante cliente nativo `pg` de Node o un query builder ligero como `Kysely` o `Knex`), garantizando el control milimétrico de las transacciones, triggers y bloqueos.
- **No se pueden omitir los logs de auditoría**: Cualquier lectura de la tabla sensible debe escribir en la tabla de auditoría; fallar al escribir la auditoría debe abortar la transacción de lectura/escritura del diagnóstico.

---

## Aspiraciones no negociables
- **Trigger PL/pgSQL robusto**: El trigger en PostgreSQL debe ser la barrera final, atómica e infranqueable contra colisiones de horario, sin depender de validaciones exclusivas en el backend que puedan fallar ante concurrencia masiva.
- **Seguridad e Inmutabilidad de la Auditoría**: La tabla de auditoría de datos sensibles no debe admitir `UPDATE` ni `DELETE` (mediante reglas/triggers o permisos específicos en base de datos si fuera necesario).
- **UI Wow**: Interfaz premium de alta fidelidad, con microanimaciones suaves para la selección de citas, alertas visuales intuitivas si se detecta un posible solapamiento en el formulario antes de enviar, y buscador rápido de pacientes.

---

## TBD (decisiones pendientes que serán resueltas en plan.md)
1. Estructura exacta de los campos del expediente del paciente para disciplinas médicas dinámicas (cómo se definirá la tabla `paciente_diagnosticos` y cómo se asociará con médicos y disciplinas).
2. Estructura del docker-compose.yml y selección del motor de base de datos específico (PostgreSQL 15 o superior).
