import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Get appointments depending on the user's role:
 * - Patient: sees only their own appointments.
 * - Doctor: sees only appointments assigned to them.
 * - Admin/Administrative/Nurse: sees all appointments in the system.
 */
export async function getAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }

  try {
    let result;

    if (user.userType === 'patient' && user.patientId) {
      // Patient view
      result = await query(
        `SELECT a.*, 
                e."displayName" as "doctorName", 
                e.specialty as "doctorSpecialty" 
         FROM "appointments" a 
         JOIN "employees" e ON a."doctorId" = e.id 
         WHERE a."patientId" = $1 
         ORDER BY a."startTime" ASC`,
        [user.patientId]
      );
    } else if (user.userType === 'employee' && user.clinicRole === 'doctor' && user.employeeId) {
      // Doctor view
      result = await query(
        `SELECT a.*, 
                p."displayName" as "patientName",
                p.phone as "patientPhone"
         FROM "appointments" a 
         JOIN "patients" p ON a."patientId" = p.id 
         WHERE a."doctorId" = $1 
         ORDER BY a."startTime" ASC`,
        [user.employeeId]
      );
    } else if (
      user.userType === 'admin' || 
      (user.userType === 'employee' && ['administrative', 'nurse', 'hr', 'executive'].includes(user.clinicRole || ''))
    ) {
      // Admin, Administrative, and Nurse can view all appointments
      result = await query(
        `SELECT a.*, 
                e."displayName" as "doctorName", 
                e.specialty as "doctorSpecialty",
                p."displayName" as "patientName",
                p.phone as "patientPhone"
         FROM "appointments" a 
         JOIN "employees" e ON a."doctorId" = e.id 
         JOIN "patients" p ON a."patientId" = p.id 
         ORDER BY a."startTime" ASC`
      );
    } else {
      // Maintenance or other staff with no scheduling permissions
      res.status(403).json({ error: 'Su rol no cuenta con permisos para ver la agenda.' });
      return;
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Error interno del servidor al cargar las citas.' });
  }
}

/**
 * Creates a new appointment.
 * Leverages the PL/pgSQL database triggers to enforce scheduling checks.
 */
export async function createAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { doctorId, patientId, startTime, endTime, reason } = req.body;

  if (!doctorId || !patientId || !startTime || !endTime || !reason) {
    res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    return;
  }

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 1. Basic future date validation
    if (start.getTime() <= Date.now()) {
      res.status(400).json({ error: 'Validación: Las citas médicas deben programarse en fecha y hora futura.' });
      return;
    }

    // 2. Perform database insert. Triggers will intercept overlaps and role validity.
    const result = await query(
      `INSERT INTO "appointments" ("doctorId", "patientId", "startTime", "endTime", reason, status) 
       VALUES ($1, $2, $3, $4, $5, 'scheduled') 
       RETURNING *`,
      [doctorId, patientId, start.toISOString(), end.toISOString(), reason.trim()]
    );

    res.status(201).json({
      message: 'Cita programada con éxito.',
      appointment: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating appointment:', error);

    // Clean trigger exception codes
    if (error.code === '45000') {
      // Overlap trigger error
      res.status(409).json({ error: error.message });
    } else if (error.code === '45002') {
      // Not a doctor trigger error
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error del servidor al registrar la cita médica.' });
    }
  }
}

/**
 * Updates an appointment inside a strict SQL transaction.
 * Requires and logs the audit "reason" into systemChangeLogs.
 */
export async function updateAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const appointmentId = req.params.id;
  const { doctorId, patientId, startTime, endTime, reason, status, cancelledBy, cancellationReason } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }

  // Database transaction connection
  const client = await query('SELECT 1'); // Obtain connection helper or run inside pool
  // To handle transactions properly with pg pool, we must get a client
  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Fetch current appointment state (oldValues)
    const currentRes = await transactionClient.query(
      'SELECT * FROM "appointments" WHERE id = $1',
      [appointmentId]
    );

    if (currentRes.rowCount === 0) {
      res.status(404).json({ error: 'Cita no encontrada.' });
      await transactionClient.query('ROLLBACK');
      return;
    }

    const oldValues = currentRes.rows[0];

    // 2. Prepare new fields
    const updatedDoctor = doctorId || oldValues.doctorId;
    const updatedPatient = patientId || oldValues.patientId;
    const updatedStart = startTime ? new Date(startTime).toISOString() : oldValues.startTime;
    const updatedEnd = endTime ? new Date(endTime).toISOString() : oldValues.endTime;
    const updatedReason = reason || oldValues.reason;
    const updatedStatus = status || oldValues.status;
    const updatedCancelledBy = cancelledBy || oldValues.cancelledBy;
    const updatedCancellationReason = cancellationReason || oldValues.cancellationReason;

    const newValues = {
      doctorId: updatedDoctor,
      patientId: updatedPatient,
      startTime: updatedStart,
      endTime: updatedEnd,
      reason: updatedReason,
      status: updatedStatus,
      cancelledBy: updatedCancelledBy,
      cancellationReason: updatedCancellationReason
    };

    // 3. Write immutable change log first
    await transactionClient.query(
      `INSERT INTO "systemChangeLogs" ("affectedTable", "recordId", "userId", "operationType", "oldValues", "newValues", reason) 
       VALUES ('appointments', $1, $2, 'UPDATE', $3, $4, $5)`,
      [appointmentId, userId, JSON.stringify(oldValues), JSON.stringify(newValues), reason.trim()]
    );

    // 4. Update the appointment table (triggers check doctor role & overlaps)
    const updateRes = await transactionClient.query(
      `UPDATE "appointments" 
       SET "doctorId" = $1, "patientId" = $2, "startTime" = $3, "endTime" = $4, 
           reason = $5, status = $6, "cancelledBy" = $7, "cancellationReason" = $8 
       WHERE id = $9 
       RETURNING *`,
      [updatedDoctor, updatedPatient, updatedStart, updatedEnd, updatedReason, updatedStatus, updatedCancelledBy, updatedCancellationReason, appointmentId]
    );

    await transactionClient.query('COMMIT');

    res.status(200).json({
      message: 'Cita modificada con éxito.',
      appointment: updateRes.rows[0]
    });
  } catch (error: any) {
    await transactionClient.query('ROLLBACK');
    console.error('Error updating appointment:', error);

    if (error.code === '45000') {
      res.status(409).json({ error: error.message });
    } else if (error.code === '45002') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error del servidor al modificar la cita.' });
    }
  } finally {
    transactionClient.release();
  }
}

/**
 * Hard deletes an appointment inside an SQL transaction.
 * Logs the deletion context and reason in systemChangeLogs before removing it.
 */
export async function deleteAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const appointmentId = req.params.id;
  const { reason } = req.body; // Sent via requireAuditReason body
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }

  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Fetch current appointment state (oldValues)
    const currentRes = await transactionClient.query(
      'SELECT * FROM "appointments" WHERE id = $1',
      [appointmentId]
    );

    if (currentRes.rowCount === 0) {
      res.status(404).json({ error: 'Cita no encontrada.' });
      await transactionClient.query('ROLLBACK');
      return;
    }

    const oldValues = currentRes.rows[0];

    // 2. Log deletion in systemChangeLogs
    await transactionClient.query(
      `INSERT INTO "systemChangeLogs" ("affectedTable", "recordId", "userId", "operationType", "oldValues", "newValues", reason) 
       VALUES ('appointments', $1, $2, 'DELETE', $3, NULL, $4)`,
      [appointmentId, userId, JSON.stringify(oldValues), reason.trim()]
    );

    // 3. Remove the record
    await transactionClient.query(
      'DELETE FROM "appointments" WHERE id = $1',
      [appointmentId]
    );

    await transactionClient.query('COMMIT');
    res.status(200).json({ message: 'Registro de cita eliminado permanentemente.' });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Error del servidor al intentar eliminar la cita.' });
  } finally {
    transactionClient.release();
  }
}
