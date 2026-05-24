import { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { EmployeeValidator, PasswordValidator } from '../utils/validation';
import { encrypt } from '../utils/crypto';

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

// Ensure the backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create backup directory:', err);
  }
}

// --------------------------------------------------------------------------------
// 1. Session Revocation endpoints
// --------------------------------------------------------------------------------

export async function getActiveSessions(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT s.id, s."userId", s."tokenJti", s."ipAddress", s."userAgent", s."loginAt", s."expiresAt",
              u.email, u."userType",
              COALESCE(e."displayName", p."displayName", 'Súper Administrador') as "displayName"
       FROM "activeSessions" s
       JOIN "users" u ON s."userId" = u.id
       LEFT JOIN "employees" e ON u."employeeId" = e.id
       LEFT JOIN "patients" p ON u."patientId" = p.id
       WHERE s."isActive" = TRUE AND s."expiresAt" > CURRENT_TIMESTAMP
       ORDER BY s."loginAt" DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error listing active sessions:', error);
    res.status(500).json({ error: 'Error del servidor al obtener las sesiones activas.' });
  }
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.params;

  try {
    const result = await query(
      'UPDATE "activeSessions" SET "isActive" = FALSE WHERE id = $1 RETURNING *',
      [sessionId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Sesión no encontrada.' });
      return;
    }

    res.status(200).json({ message: 'Sesión revocada de forma inmediata. El usuario ha sido expulsado del sistema.' });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ error: 'Error del servidor al intentar revocar la sesión.' });
  }
}

// --------------------------------------------------------------------------------
// 2. User & Password endpoints
// --------------------------------------------------------------------------------

export async function changeUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { userId, newPassword, reason } = req.body; // reason enforced by PUT requireAuditReason

  if (!userId || !newPassword) {
    res.status(400).json({ error: 'UserId y newPassword son campos obligatorios.' });
    return;
  }

  // Enforce high-entropy password requirements (V-02)
  const passwordValidation = PasswordValidator.safeParse(newPassword);
  if (!passwordValidation.success) {
    res.status(400).json({ error: passwordValidation.error.errors[0].message });
    return;
  }

  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Fetch user (oldValues)
    const userRes = await transactionClient.query(
      'SELECT id, email, "userType" FROM "users" WHERE id = $1',
      [userId]
    );

    if (userRes.rowCount === 0) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      await transactionClient.query('ROLLBACK');
      return;
    }

    const oldValues = userRes.rows[0];

    // 2. Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 3. Write audit log
    await transactionClient.query(
      `INSERT INTO "systemChangeLogs" ("affectedTable", "recordId", "userId", "operationType", "oldValues", "newValues", reason)
       VALUES ('users', $1, $2, 'UPDATE', $3, $4, $5)`,
      [userId, req.user?.id, JSON.stringify(oldValues), JSON.stringify({ email: oldValues.email, passwordUpdated: true }), reason.trim()]
    );

    // 4. Update password
    await transactionClient.query(
      'UPDATE "users" SET "passwordHash" = $1 WHERE id = $2',
      [passwordHash, userId]
    );

    // 5. Invalidate all active sessions for this user (force them to re-authenticate with the new password)
    await transactionClient.query(
      'UPDATE "activeSessions" SET "isActive" = FALSE WHERE "userId" = $1',
      [userId]
    );

    await transactionClient.query('COMMIT');
    res.status(200).json({ message: 'Contraseña cambiada con éxito. Se han cerrado las sesiones activas del usuario por seguridad.' });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar la contraseña.' });
  } finally {
    transactionClient.release();
  }
}

// --------------------------------------------------------------------------------
// 3. SQL Database Backups
// --------------------------------------------------------------------------------

export async function generateBackup(req: Request, res: Response): Promise<void> {
  const filename = `clinicalflow_backup_${Date.now()}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  // command: pg_dump -h db -U postgres clinicalflow -f /backups/filename.sql
  // Using PGPASSWORD dynamically from environment configuration
  const command = `PGPASSWORD="${dbPassword}" pg_dump -h db -U postgres clinicalflow -f "${filepath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup pg_dump failed:', error, stderr);
      res.status(500).json({ error: 'Fallo al ejecutar el respaldo nativo de PostgreSQL (pg_dump).' });
      return;
    }

    try {
      const stats = fs.statSync(filepath);
      res.status(201).json({
        message: 'Copia de seguridad SQL generada y guardada con éxito.',
        backup: {
          filename,
          size: stats.size,
          createdAt: stats.birthtime
        }
      });
    } catch (fsErr) {
      res.status(201).json({
        message: 'Respaldo generado con éxito.',
        backup: {
          filename,
          size: 0,
          createdAt: new Date()
        }
      });
    }
  });
}

export function listBackups(req: Request, res: Response): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filepath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.status(200).json(backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Fallo al escanear los archivos de respaldo locales.' });
  }
}

export function downloadBackup(req: Request, res: Response): void {
  const { filename } = req.params;
  
  // Extract strictly the base filename to completely block directory traversal (V-03)
  const safeFilename = path.basename(filename);
  const filepath = path.join(BACKUP_DIR, safeFilename);

  if (!safeFilename.endsWith('.sql')) {
    res.status(403).json({ error: 'Petición inválida o denegada por formato incorrecto.' });
    return;
  }

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Archivo de respaldo no encontrado.' });
    return;
  }

  res.download(filepath, safeFilename);
}

// --------------------------------------------------------------------------------
// 4. HR & Employee Administration CRUD
// --------------------------------------------------------------------------------

export async function getEmployees(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      'SELECT * FROM "employees" ORDER BY "lastName" ASC, "firstName" ASC'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error listing employees:', error);
    res.status(500).json({ error: 'Error del servidor al obtener la nómina de empleados.' });
  }
}

export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  // 1. Validate password complexity (V-02)
  const passwordValidation = PasswordValidator.safeParse(req.body.password);
  if (!passwordValidation.success) {
    res.status(400).json({ error: passwordValidation.error.errors[0].message });
    return;
  }

  // 2. Validate overall Employee fields (V-01)
  const employeeValidation = EmployeeValidator.safeParse(req.body);
  if (!employeeValidation.success) {
    res.status(400).json({ error: employeeValidation.error.errors[0].message });
    return;
  }

  const { firstName, lastName, email, phone, department, clinicRole, specialty, payrollNumber, salary, hireDate, workSchedule } = employeeValidation.data;
  const password = passwordValidation.data;

  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Check if email already exists in users or employees
    const emailCheck = await transactionClient.query(
      'SELECT id FROM "users" WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (emailCheck.rowCount > 0) {
      res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado por otro usuario.' });
      await transactionClient.query('ROLLBACK');
      return;
    }

    // 2. Create the Employee profile
    const empRes = await transactionClient.query(
      `INSERT INTO "employees" 
         ("firstName", "lastName", email, phone, department, "clinicRole", specialty, "payrollNumber", salary, "hireDate", "workSchedule") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        firstName.trim(), 
        lastName.trim(), 
        email.toLowerCase().trim(), 
        phone.trim(), 
        department.trim(), 
        clinicRole.trim(), 
        specialty ? specialty.trim() : null, 
        payrollNumber.trim(), 
        salary, 
        hireDate ? new Date(hireDate) : new Date(), 
        workSchedule ? workSchedule.trim() : null
      ]
    );

    const newEmployee = empRes.rows[0];

    // 3. Hash password and create User login credentials
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await transactionClient.query(
      `INSERT INTO "users" (email, "passwordHash", "userType", "employeeId") 
       VALUES ($1, $2, 'employee', $3)`,
      [email.toLowerCase().trim(), passwordHash, newEmployee.id]
    );

    await transactionClient.query('COMMIT');
    res.status(201).json({
      message: 'Ficha de empleado y cuenta creadas con éxito.',
      employee: newEmployee
    });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Error interno al registrar la ficha laboral del empleado.' });
  } finally {
    transactionClient.release();
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employeeId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }

  // 1. Partial Zod validation for updating employee details (V-01)
  const partialEmployeeValidator = EmployeeValidator.partial();
  const validation = partialEmployeeValidator.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.errors[0].message });
    return;
  }

  const { firstName, lastName, email, phone, department, clinicRole, specialty, payrollNumber, salary, hireDate, workSchedule, performanceRating, hrNotes, resumeExperience, associatedDocuments } = validation.data;
  const { reason } = req.body; // Reason is handled by requireAuditReason middleware

  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Fetch current employee state (oldValues)
    const currentRes = await transactionClient.query(
      'SELECT * FROM "employees" WHERE id = $1',
      [employeeId]
    );

    if (currentRes.rowCount === 0) {
      res.status(404).json({ error: 'Empleado no encontrado.' });
      await transactionClient.query('ROLLBACK');
      return;
    }

    const oldValues = currentRes.rows[0];

    // 2. Prepare new fields
    const newValues = {
      firstName: firstName || oldValues.firstName,
      lastName: lastName || oldValues.lastName,
      email: email ? email.toLowerCase().trim() : oldValues.email,
      phone: phone || oldValues.phone,
      department: department || oldValues.department,
      clinicRole: clinicRole || oldValues.clinicRole,
      specialty: specialty !== undefined ? specialty : oldValues.specialty,
      payrollNumber: payrollNumber || oldValues.payrollNumber,
      salary: salary !== undefined ? salary : oldValues.salary,
      hireDate: hireDate ? new Date(hireDate).toISOString().split('T')[0] : oldValues.hireDate,
      workSchedule: workSchedule !== undefined ? workSchedule : oldValues.workSchedule,
      performanceRating: performanceRating !== undefined ? performanceRating : oldValues.performanceRating,
      hrNotes: hrNotes !== undefined ? hrNotes : oldValues.hrNotes,
      resumeExperience: resumeExperience !== undefined ? resumeExperience : oldValues.resumeExperience,
      associatedDocuments: associatedDocuments !== undefined ? associatedDocuments : oldValues.associatedDocuments
    };

    // 3. Write audit log
    await transactionClient.query(
      `INSERT INTO "systemChangeLogs" ("affectedTable", "recordId", "userId", "operationType", "oldValues", "newValues", reason) 
       VALUES ('employees', $1, $2, 'UPDATE', $3, $4, $5)`,
      [employeeId, userId, JSON.stringify(oldValues), JSON.stringify(newValues), reason.trim()]
    );

    // 4. Update employee details
    const updateRes = await transactionClient.query(
      `UPDATE "employees" 
       SET "firstName" = $1, "lastName" = $2, email = $3, phone = $4, department = $5, 
           "clinicRole" = $6, specialty = $7, "payrollNumber" = $8, salary = $9, 
           "hireDate" = $10, "workSchedule" = $11, "performanceRating" = $12, 
           "hrNotes" = $13, "resumeExperience" = $14, "associatedDocuments" = $15
       WHERE id = $16 
       RETURNING *`,
      [
        newValues.firstName,
        newValues.lastName,
        newValues.email,
        newValues.phone,
        newValues.department,
        newValues.clinicRole,
        newValues.specialty,
        newValues.payrollNumber,
        newValues.salary,
        newValues.hireDate,
        newValues.workSchedule,
        newValues.performanceRating,
        newValues.hrNotes,
        newValues.resumeExperience,
        JSON.stringify(newValues.associatedDocuments),
        employeeId
      ]
    );

    // 5. Update matching user email if it has changed
    if (newValues.email !== oldValues.email) {
      await transactionClient.query(
        'UPDATE "users" SET email = $1 WHERE "employeeId" = $2',
        [newValues.email, employeeId]
      );
    }

    await transactionClient.query('COMMIT');
    res.status(200).json({
      message: 'Ficha de personal actualizada con éxito.',
      employee: updateRes.rows[0]
    });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Error del servidor al intentar actualizar el perfil laboral.' });
  } finally {
    transactionClient.release();
  }
}

// Arrays of realistic Spanish names and last names for programmatic seed generation
const firstNames = ['Antonio', 'José', 'Manuel', 'Francisco', 'David', 'Juan', 'María', 'Carmen', 'Ana', 'Isabel', 'Dolores', 'Pilar', 'Javier', 'Daniel', 'Carlos', 'Alejandro', 'Sofía', 'Lucía', 'Paula', 'Sara', 'Miguel', 'Laura', 'Elena', 'Diego', 'Andrés'];
const lastNames = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Ramos', 'Vázquez'];

const diagnosesTemplates = [
  'Hipertensión arterial controlada, continuar con tratamiento actual.',
  'Soplo cardíaco leve, sin repercusión hemodinámica actual.',
  'Faringoamigdalitis aguda, reposo e hidratación abundante.',
  'Asma bronquial en fase estable, control con budesonida inhalada.',
  'Gastroenteritis aguda, dieta blanda y rehidratación oral.',
  'Arritmia cardíaca en estudio, se solicita holter de 24 horas.',
  'Diabetes Mellitus Tipo 2 compensada con metformina.'
];
const clinicalNotesTemplates = [
  'Paciente refiere buena tolerancia a la medicación. Presión arterial dentro de rangos normales.',
  'Ecocardiografía muestra fracción de eyección normal. Próximo control en seis meses.',
  'Exploración orofaríngea muestra congestión severa. Sin placas purulentas.',
  'Espirometría estable. Paciente refiere sibilancias leves con el ejercicio físico.',
  'Abdomen blando, depresible, dolor leve a la palpación difusa. Ruidos intestinales aumentados.',
  'Se explica al paciente la importancia de registrar la actividad física durante el holter.',
  'Glucemia en ayunas estable. Se insiste en dieta baja en carbohidratos y ejercicio regular.'
];

/**
 * Clears all fictitious mock data from the database, preparing the system for production.
 * Only the Súper Administrador user is preserved.
 * Immutability triggers are temporarily disabled and re-enabled during this administrative task.
 */
export async function cleanMockData(req: Request, res: Response): Promise<void> {
  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // Temporarily disable audit immutability triggers for administrative cleanup
    await transactionClient.query('ALTER TABLE "sensitiveAuditLogs" DISABLE TRIGGER trg_prevent_update_delete_sensitive_audit');
    await transactionClient.query('ALTER TABLE "systemChangeLogs" DISABLE TRIGGER trg_prevent_update_delete_system_changes');

    // Wipe tables
    await transactionClient.query('DELETE FROM "appointments"');
    await transactionClient.query('DELETE FROM "patientDiagnoses"');
    await transactionClient.query('DELETE FROM "patientDoctors"');
    await transactionClient.query('DELETE FROM "activeSessions" WHERE "userId" IN (SELECT id FROM "users" WHERE "userType" <> \'admin\')');
    await transactionClient.query('DELETE FROM "users" WHERE "userType" <> \'admin\'');
    await transactionClient.query('DELETE FROM "patients"');
    await transactionClient.query('DELETE FROM "employees"');
    await transactionClient.query('DELETE FROM "sensitiveAuditLogs"');
    await transactionClient.query('DELETE FROM "systemChangeLogs"');

    // Re-enable triggers immediately
    await transactionClient.query('ALTER TABLE "sensitiveAuditLogs" ENABLE TRIGGER trg_prevent_update_delete_sensitive_audit');
    await transactionClient.query('ALTER TABLE "systemChangeLogs" ENABLE TRIGGER trg_prevent_update_delete_system_changes');

    await transactionClient.query('COMMIT');
    res.status(200).json({ 
      message: 'Todos los datos ficticios y de auditoría han sido eliminados de forma exitosa. El sistema está limpio y listo para producción. Se ha conservado la cuenta de Súper Administrador.' 
    });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error cleaning mock data:', error);
    res.status(500).json({ error: 'Fallo interno al intentar eliminar los datos ficticios.' });
  } finally {
    transactionClient.release();
  }
}

/**
 * Programmatically generates 100 fictitious patients with polymorphic accounts,
 * conflict-free appointment schedules, multiple doctor interactions, and properly encrypted clinical diagnoses.
 */
export async function generateMockData(req: Request, res: Response): Promise<void> {
  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Temporarily disable audit triggers to clear logs cleanly
    await transactionClient.query('ALTER TABLE "sensitiveAuditLogs" DISABLE TRIGGER trg_prevent_update_delete_sensitive_audit');
    await transactionClient.query('ALTER TABLE "systemChangeLogs" DISABLE TRIGGER trg_prevent_update_delete_system_changes');

    // 2. Wipe existing testing data to prevent duplicates
    await transactionClient.query('DELETE FROM "appointments"');
    await transactionClient.query('DELETE FROM "patientDiagnoses"');
    await transactionClient.query('DELETE FROM "patientDoctors"');
    await transactionClient.query('DELETE FROM "activeSessions" WHERE "userId" IN (SELECT id FROM "users" WHERE "userType" <> \'admin\')');
    await transactionClient.query('DELETE FROM "users" WHERE "userType" <> \'admin\'');
    await transactionClient.query('DELETE FROM "patients"');
    await transactionClient.query('DELETE FROM "employees"');
    await transactionClient.query('DELETE FROM "sensitiveAuditLogs"');
    await transactionClient.query('DELETE FROM "systemChangeLogs"');

    // 3. Re-enable audit triggers
    await transactionClient.query('ALTER TABLE "sensitiveAuditLogs" ENABLE TRIGGER trg_prevent_update_delete_sensitive_audit');
    await transactionClient.query('ALTER TABLE "systemChangeLogs" ENABLE TRIGGER trg_prevent_update_delete_system_changes');

    // 4. Re-insert baseline employees (Cardiologist, Pediatrician, and HR Specialist)
    await transactionClient.query(`
      INSERT INTO "employees" (id, "firstName", "lastName", email, phone, department, "clinicRole", specialty, "payrollNumber", salary, "hireDate", "workSchedule")
      VALUES 
        ('e1111111-1111-1111-1111-111111111111', 'Juan', 'Pérez', 'juan.perez@clinicalflow.com', '+34 600 111 222', 'Medical', 'doctor', 'Cardiología', 'EMP-001', 8500.00, '2022-01-15', 'Lunes a Viernes 08:00 - 16:00'),
        ('e2222222-2222-2222-2222-222222222222', 'María', 'Gómez', 'maria.gomez@clinicalflow.com', '+34 600 222 333', 'Medical', 'doctor', 'Pediatría', 'EMP-002', 9000.00, '2021-06-01', 'Lunes a Viernes 10:00 - 18:00'),
        ('e6666666-6666-6666-6666-666666666666', 'Laura', 'Delgado', 'laura.delgado@clinicalflow.com', '+34 600 666 777', 'HR', 'hr', NULL, 'EMP-006', 4000.00, '2023-05-15', 'Lunes a Viernes 08:30 - 16:30')
    `);

    // 5. Re-insert corresponding users
    const passwordHash = '$2a$10$jm.VbIztnxvu7BXQL2cBUeAOHzbEC8HoVGnkbaNbkvKsR69R4H/H.'; // hash for 'password123'
    await transactionClient.query(`
      INSERT INTO "users" (id, email, "passwordHash", "userType", "employeeId")
      VALUES 
        ('c1111111-1111-1111-1111-111111111111', 'juan.perez@clinicalflow.com', $1, 'employee', 'e1111111-1111-1111-1111-111111111111'),
        ('c2222222-2222-2222-2222-222222222222', 'maria.gomez@clinicalflow.com', $1, 'employee', 'e2222222-2222-2222-2222-222222222222'),
        ('c6666666-6666-6666-6666-666666666666', 'laura.delgado@clinicalflow.com', $1, 'employee', 'e6666666-6666-6666-6666-666666666666')
    `, [passwordHash]);

    // 6. Loop to programmatically generate 100 unique patients with multiple medical interactions
    for (let i = 1; i <= 100; i++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln1 = lastNames[Math.floor(Math.random() * lastNames.length)];
      const ln2 = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = fn;
      const surname = `${ln1} ${ln2}`;
      
      const email = `${fn.toLowerCase().replace(/[^a-z]/g, '')}.${ln1.toLowerCase().replace(/[^a-z]/g, '')}${i}@gmail.com`;
      const dni = `DNI${10000000 + i}`;
      const phone = `+34 600 ${String(100000 + i).slice(0, 3)} ${String(100000 + i).slice(3, 6)}`;

      // Insert patient details
      const patientRes = await transactionClient.query(`
        INSERT INTO "patients" ("firstName", "lastName", "identityNumber", email, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [name, surname, dni, email, phone]);
      
      const patientId = patientRes.rows[0].id;

      // Insert patient user login account
      await transactionClient.query(`
        INSERT INTO "users" (email, "passwordHash", "userType", "patientId")
        VALUES ($1, $2, 'patient', $3)
      `, [email, passwordHash, patientId]);

      // Determine primary care doctor and alternative specialist (polymorphic care)
      const primaryDocId = i % 2 === 0 ? 'e1111111-1111-1111-1111-111111111111' : 'e2222222-2222-2222-2222-222222222222';
      const specialistDocId = i % 2 === 0 ? 'e2222222-2222-2222-2222-222222222222' : 'e1111111-1111-1111-1111-111111111111';

      // 1. Set Primary Doctor
      await transactionClient.query(`
        INSERT INTO "patientDoctors" ("patientId", "doctorId", "relationshipType")
        VALUES ($1, $2, 'primary')
      `, [patientId, primaryDocId]);

      // 2. Set Specialist Doctor for most patients (to satisfy "multiple doctor" requirement)
      if (i % 3 !== 0) {
        await transactionClient.query(`
          INSERT INTO "patientDoctors" ("patientId", "doctorId", "relationshipType")
          VALUES ($1, $2, 'specialist')
        `, [patientId, specialistDocId]);
      }

      // 3. Schedule conflict-free appointments
      // Base date: Monday, May 31, 2027 (avoids weekend constraints)
      const dayOffset = i % 5;      // 5 days: Monday (0) to Friday (4)
      const hourOffset = i % 8;     // 8 hours: 08:00 to 15:00
      const weekOffset = Math.floor(i / 40); // distributes 40 slots per week
      
      const startTime = new Date('2027-05-31T08:00:00.000Z');
      startTime.setDate(startTime.getDate() + dayOffset + (weekOffset * 7));
      startTime.setHours(startTime.getHours() + hourOffset);
      
      const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes later

      await transactionClient.query(`
        INSERT INTO "appointments" ("doctorId", "patientId", "startTime", "endTime", reason, status)
        VALUES ($1, $2, $3, $4, 'Consulta médica de seguimiento periódico para control clínico.', 'scheduled')
      `, [primaryDocId, patientId, startTime.toISOString(), endTime.toISOString()]);

      // 4. Create an encrypted health history diagnosis (AES-256-GCM)
      const discipline = i % 2 === 0 ? 'Cardiología' : 'Pediatría';
      const diagText = diagnosesTemplates[i % diagnosesTemplates.length];
      const notesText = clinicalNotesTemplates[i % clinicalNotesTemplates.length];

      const encryptedDiag = encrypt(diagText);
      const encryptedNotes = encrypt(notesText);

      await transactionClient.query(`
        INSERT INTO "patientDiagnoses" ("patientId", "doctorId", discipline, "encryptedDiagnosis", "encryptedClinicalNotes", "diagnosisDate")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [patientId, primaryDocId, discipline, encryptedDiag, encryptedNotes, startTime.toISOString()]);
    }

    await transactionClient.query('COMMIT');
    res.status(201).json({ 
      message: 'Se han generado con éxito 100 pacientes ficticios con múltiples interacciones, asignaciones médicas complejas, citas libres de conflicto y diagnósticos completamente cifrados con AES-256-GCM.' 
    });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error generating mock data:', error);
    res.status(500).json({ error: 'Fallo interno al generar los 100 pacientes de prueba.' });
  } finally {
    transactionClient.release();
  }
}
