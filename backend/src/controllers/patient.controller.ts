import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { PatientValidator } from '../utils/validation';

/**
 * Lists all patients in the system.
 * Accessible to employees and admins.
 */
export async function getPatients(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      'SELECT * FROM "patients" ORDER BY "lastName" ASC, "firstName" ASC'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error listing patients:', error);
    res.status(500).json({ error: 'Error del servidor al obtener la lista de pacientes.' });
  }
}

/**
 * Registers a new patient.
 * Automatically provisions a "users" login account using 'password123' as default.
 */
export async function createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
  const validation = PatientValidator.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.errors[0].message });
    return;
  }

  const { firstName, lastName, identityNumber, email, phone } = validation.data;

  const db = require('../config/db').default;
  const transactionClient = await db.connect();

  try {
    await transactionClient.query('BEGIN');

    // 1. Check if email already exists in users
    const emailCheck = await transactionClient.query(
      'SELECT id FROM "users" WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (emailCheck.rowCount > 0) {
      res.status(400).json({ error: 'El correo electrónico ya está registrado en el sistema.' });
      await transactionClient.query('ROLLBACK');
      return;
    }

    // 2. Insert into patients
    const patientRes = await transactionClient.query(
      `INSERT INTO "patients" ("firstName", "lastName", "identityNumber", email, phone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [firstName.trim(), lastName.trim(), identityNumber.trim(), email.toLowerCase().trim(), phone.trim()]
    );

    const newPatient = patientRes.rows[0];

    // 3. Provision user credentials (default: password123)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    await transactionClient.query(
      `INSERT INTO "users" (email, "passwordHash", "userType", "patientId") 
       VALUES ($1, $2, 'patient', $3)`,
      [email.toLowerCase().trim(), passwordHash, newPatient.id]
    );

    await transactionClient.query('COMMIT');

    res.status(201).json({
      message: 'Paciente registrado y cuenta activada con contraseña predeterminada (password123).',
      patient: newPatient
    });
  } catch (error) {
    await transactionClient.query('ROLLBACK');
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Error del servidor al intentar registrar al paciente.' });
  } finally {
    transactionClient.release();
  }
}
