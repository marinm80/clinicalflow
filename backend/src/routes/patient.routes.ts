import { Router } from 'express';
import { getPatients, createPatient } from '../controllers/patient.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// Retrieve all patients (Employees and Admins)
router.get('/', authenticateToken, authorizeRoles(['admin', 'employee'], ['administrative', 'nurse', 'doctor']), getPatients);

// Register a new patient (Admins, Administrative and Nurse staff only)
router.post('/', authenticateToken, authorizeRoles(['admin', 'employee'], ['administrative', 'nurse']), createPatient);

export default router;
