import { Router } from 'express';
import { getDiagnosesByPatient, createDiagnosis } from '../controllers/diagnosis.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// Retrieve medical records (strictly Doctors and Admins)
router.get(
  '/patient/:patientId', 
  authenticateToken, 
  authorizeRoles(['admin', 'employee'], ['doctor']), 
  getDiagnosesByPatient
);

// Register a new diagnosis (strictly Doctors only)
router.post(
  '/', 
  authenticateToken, 
  authorizeRoles(['employee'], ['doctor']), 
  createDiagnosis
);

export default router;
