# ClinicalFlow 🩺 - Sistema de Gestión de Agendas Médicas y RRHH

ClinicalFlow es una plataforma web full-stack premium y de alto rendimiento, diseñada para la administración y planificación de turnos en clínicas médicas. Está construida bajo una arquitectura modular robusta, enfocada en la integridad de datos transaccionales, auditoría avanzada y seguridad criptográfica.

## 🚀 Características Clave Implementadas

1. **Agenda Médica sin Solapamientos**: Resguardada por un trigger PL/pgSQL nativo de base de datos (`trg_prevent_appointment_overlap`) como última línea de defensa atómica contra colisiones horarias.
2. **Nómina y RRHH Unificados (`"employees"`)**: Fusión de médicos y todo el personal clínico en una sola tabla normalizada en inglés con soporte de salarios, nómina única, evaluaciones de desempeño, historial curricular y carga dinámica de contratos/documentos en formato `JSONB`.
3. **Cifrado de Datos de Salud (GCM)**: Diagnósticos y notas clínicas encriptados en reposo usando algoritmos criptográficos simétricos premium **AES-256-GCM** en el backend.
4. **Log de Auditoría Inmutable (PHI)**: Cada lectura o registro de expedientes médicos es auditado con una inserción en la tabla de auditoría `"sensitiveAuditLogs"`.
5. **Justificación Obligatoria de Ediciones/Eliminaciones**: El middleware global rechaza cualquier petición de modificación (`PUT`, `PATCH`, `DELETE`) que no contenga un motivo explícito de al menos 10 caracteres, registrándolo en `"systemChangeLogs"`.
6. **Desconexión en Vivo (Revocación de Sesiones)**: Monitoreo en tiempo real de sesiones activas desde la UI del Súper Administrador, permitiendo revocar y desconectar a cualquier usuario conectado de forma inmediata.
7. **Respaldos de Base de Datos SQL**: Botón destacado en el panel del Súper Administrador para generar copias de seguridad de PostgreSQL (`pg_dump`) y descargarlas localmente.
8. **Diseño Visual de Alta Fidelidad**: Interfaz oscura de estética premium con Vanilla CSS que incluye glassmorphism, layouts de agenda, buscador de pacientes y modales interactivos.

---

## 🛠️ Requisitos e Instalación

Para ejecutar la aplicación localmente de forma containerizada y aislada, asegúrate de tener instalado **Docker** y **Docker Compose**.

1. **Clonar e Ingresar al Espacio de Trabajo**:
   ```bash
   cd ClinicalFlow
   ```
2. **Configuración de Variables de Entorno**:
   El sistema está preconfigurado para levantar con el archivo `env.config` del directorio raíz, el cual contiene claves simétricas AES y secretos JWT seguros para desarrollo local.

3. **Compilar y Levantar el Entorno Docker**:
   ```bash
   docker-compose up --build
   ```

4. **Acceder a la Aplicación**:
   - **Frontend (UI)**: [http://localhost:3000](http://localhost:3000)
   - **Backend (API)**: [http://localhost:5000](http://localhost:5000)
   - **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 🧪 Ejecutar Suite de Pruebas de Integración

Nuestra suite de pruebas de integración automática en TypeScript (`backend/tests/integration.test.ts`) valida los triggers SQL, el cifrado de datos y las restricciones de auditoría en la base de datos PostgreSQL real.

Para ejecutarlos:
1. Asegúrate de tener los contenedores levantados.
2. Corre el siguiente comando dentro del contenedor del backend o en tu entorno local:
   ```bash
   # Dentro del directorio backend/
   npm run test
   ```

---

## 🔑 Credenciales de Acceso Rápido (Testing)

La pantalla de login incluye **cues visuales (botones interactivos)** en la parte inferior para iniciar sesión al instante con un solo clic con los diferentes roles:

| Rol de Sistema | Usuario de Acceso | Contraseña |
|---|---|---|
| **Súper Administrador** | `admin@clinicalflow.com` | `password123` |
| **Médico (Cardiología)** | `juan.perez@clinicalflow.com` | `password123` |
| **Médico (Pediatría)** | `maria.gomez@clinicalflow.com` | `password123` |
| **Enfermera** | `ana.martinez@clinicalflow.com` | `password123` |
| **Recepcionista** | `carlos.ruiz@clinicalflow.com` | `password123` |
| **Recursos Humanos** | `laura.delgado@clinicalflow.com` | `password123` |
| **Paciente** | `pedro.infante@gmail.com` | `password123` |
