import { Router } from 'express';
import { 
  getActiveSessions, 
  revokeSession, 
  changeUserPassword, 
  generateBackup, 
  listBackups, 
  downloadBackup,
  getEmployees,
  createEmployee,
  updateEmployee,
  cleanMockData,
  generateMockData
} from '../controllers/admin.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';
import { requireAuditReason } from '../middlewares/audit.middleware';

const router = Router();

// -----------------------------------------------------------------------------
// 1. Session Revocation (Súper Administrador only)
// -----------------------------------------------------------------------------
router.get('/sessions', authenticateToken, authorizeRoles(['admin']), getActiveSessions);
router.post('/sessions/:sessionId/revoke', authenticateToken, authorizeRoles(['admin']), revokeSession);

// -----------------------------------------------------------------------------
// 2. Global Password Reset (Súper Administrador only, requires audit reason)
// -----------------------------------------------------------------------------
router.put('/change-password', authenticateToken, requireAuditReason, authorizeRoles(['admin']), changeUserPassword);

// -----------------------------------------------------------------------------
// 3. PostgreSQL SQL Backups (Súper Administrador only)
// -----------------------------------------------------------------------------
router.post('/backups', authenticateToken, authorizeRoles(['admin']), generateBackup);
router.get('/backups', authenticateToken, authorizeRoles(['admin']), listBackups);
router.get('/backups/:filename/download', authenticateToken, authorizeRoles(['admin']), downloadBackup);

// -----------------------------------------------------------------------------
// 4. HR & Employee Administration (Admins, HR and Executive staff only)
// -----------------------------------------------------------------------------
router.get('/employees', authenticateToken, authorizeRoles(['admin', 'employee'], ['hr', 'executive']), getEmployees);
router.post('/employees', authenticateToken, authorizeRoles(['admin', 'employee'], ['hr', 'executive']), createEmployee);
router.put('/employees/:id', authenticateToken, requireAuditReason, authorizeRoles(['admin', 'employee'], ['hr', 'executive']), updateEmployee);

// -----------------------------------------------------------------------------
// 5. Mock Data Seed Controls (Súper Administrador only)
// -----------------------------------------------------------------------------
router.post('/clean-mock-data', authenticateToken, authorizeRoles(['admin']), cleanMockData);
router.post('/generate-mock-data', authenticateToken, authorizeRoles(['admin']), generateMockData);

export default router;
