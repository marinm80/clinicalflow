import { Response } from 'express';
import { query } from '../config/db';
import { encrypt, decrypt } from '../utils/crypto';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { DiagnosisValidator } from '../utils/validation';

/**
 * Retrieves the encrypted diagnoses for a patient, decrypts them in memory,
 * and strictly logs an immutable read event in sensitiveAuditLogs inside a transaction.
 */
export async function getDiagnosesByPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const patientId = req.params.patientId;
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }

  // Double check role permission: Only Doctors and Admins can view health records
  if (user.userType !== 'admin' && !(user.userType === 'employee' && user.clinicRole === 'doctor')) {
    res.status(403).json({ error: 'Acceso denegado: No cuenta con privilegios médicos para consultar historiales clínicos.' });
    return;
  }

  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Fetch encrypted diagnoses from database
    const diagRes = await transactionClient.query(
      `SELECT d.*, 
              e."displayName" as "doctorName", 
              e.specialty as "doctorSpecialty" 
       FROM "patientDiagnoses" d 
       JOIN "employees" e ON d."doctorId" = e.id 
       WHERE d."patientId" = $1 
       ORDER BY d."diagnosisDate" DESC`,
      [patientId]
    );

    // 2. Decrypt records in-memory
    const decryptedDiagnoses = diagRes.rows.map((row: any) => {
      try {
        return {
          id: row.id,
          patientId: row.patientId,
          doctorId: row.doctorId,
          doctorName: row.doctorName,
          doctorSpecialty: row.doctorSpecialty,
          discipline: row.discipline,
          diagnosis: decrypt(row.encryptedDiagnosis),
          clinicalNotes: decrypt(row.encryptedClinicalNotes),
          diagnosisDate: row.diagnosisDate
        };
      } catch (err) {
        return {
          id: row.id,
          patientId: row.patientId,
          doctorId: row.doctorId,
          doctorName: row.doctorName,
          doctorSpecialty: row.doctorSpecialty,
          discipline: row.discipline,
          diagnosis: '[ERROR AL DESCIFRAR DIAGNÓSTICO]',
          clinicalNotes: '[ERROR AL DESCIFRAR NOTAS CLÍNICAS]',
          diagnosisDate: row.diagnosisDate
        };
      }
    });

    // 3. Write immutable read audit log inside the same transaction
    const logDetails = `Consulta del expediente clínico. Total de registros recuperados: ${decryptedDiagnoses.length}.`;
    await transactionClient.query(
      `INSERT INTO "sensitiveAuditLogs" ("userId", "patientId", action, details) 
       VALUES ($1, $2, 'READ_DIAGNOSIS_HISTORY', $3)`,
      [user.id, patientId, logDetails]
    );

    await transactionClient.query('COMMIT');
    res.status(200).json(decryptedDiagnoses);
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error fetching clinical diagnoses:', error);
    res.status(500).json({ error: 'Error del servidor al cargar el historial clínico.' });
  } finally {
    transactionClient.release();
  }
}

/**
 * Creates a new patient clinical diagnosis.
 * Encrypts sensitive fields (diagnosis, clinicalNotes) and records a write event in sensitiveAuditLogs.
 */
export async function createDiagnosis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user;

  if (!user || user.userType !== 'employee' || user.clinicRole !== 'doctor') {
    res.status(403).json({ error: 'Acceso denegado: Solo médicos con licencia pueden registrar diagnósticos.' });
    return;
  }

  const validation = DiagnosisValidator.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.errors[0].message });
    return;
  }

  const { patientId, discipline, diagnosis, clinicalNotes } = validation.data;

  const doctorId = user.employeeId; // Link dynamically to current authenticated doctor
  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Encrypt sensitive health data
    const encryptedDiag = encrypt(diagnosis.trim());
    const encryptedNotes = encrypt(clinicalNotes.trim());

    // 2. Insert diagnosis (triggers verify doctor role validation)
    const diagRes = await transactionClient.query(
      `INSERT INTO "patientDiagnoses" ("patientId", "doctorId", discipline, "encryptedDiagnosis", "encryptedClinicalNotes") 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [patientId, doctorId, discipline.trim(), encryptedDiag, encryptedNotes]
    );

    // 3. Write immutable creation audit log
    const logDetails = `Registro de nuevo diagnóstico para la disciplina: ${discipline.trim()} por ${user.displayName || 'Médico'}.`;
    await transactionClient.query(
      `INSERT INTO "sensitiveAuditLogs" ("userId", "patientId", action, details) 
       VALUES ($1, $2, 'CREATE_DIAGNOSIS', $3)`,
      [user.id, patientId, logDetails]
    );

    await transactionClient.query('COMMIT');

    res.status(201).json({
      message: 'Diagnóstico clínico registrado de forma segura.',
      diagnosisId: diagRes.rows[0].id
    });
  } catch (error: any) {
    await transactionClient.query('ROLLBACK');
    console.error('Error creating clinical diagnosis:', error);

    if (error.code === '45002') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error del servidor al registrar el diagnóstico.' });
    }
  } finally {
    transactionClient.release();
  }
}
