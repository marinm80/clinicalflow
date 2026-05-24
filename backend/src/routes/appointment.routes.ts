import { Router } from 'express';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../controllers/appointment.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';
import { requireAuditReason } from '../middlewares/audit.middleware';

const router = Router();

// Retrieve appointments (filtered automatically by user role)
router.get('/', authenticateToken, getAppointments);

// Book new appointment (Admins and scheduling staff)
router.post(
  '/', 
  authenticateToken, 
  authorizeRoles(['admin', 'employee'], ['administrative', 'nurse', 'doctor']), 
  createAppointment
);

// Update appointment (requires audit reason)
router.put(
  '/:id', 
  authenticateToken, 
  requireAuditReason, 
  authorizeRoles(['patient', 'employee', 'admin'], ['administrative', 'nurse', 'doctor']), 
  updateAppointment
);

// Hard delete appointment (requires audit reason, administrative only)
router.delete(
  '/:id', 
  authenticateToken, 
  requireAuditReason, 
  authorizeRoles(['admin', 'employee'], ['administrative']), 
  deleteAppointment
);

export default router;
