import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforclinicalflow123';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: 'patient' | 'employee' | 'admin';
    patientId: string | null;
    employeeId: string | null;
    tokenJti: string;
    displayName?: string;
    clinicRole?: 'doctor' | 'nurse' | 'administrative' | 'maintenance' | 'hr' | 'executive';
    department?: string;
  };
}

/**
 * Middleware to authenticate requests, verify JWT, and validate active sessions in the database.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Also check HTTP-only cookies if available (read securely via cookie-parser)
  if (!token && req.cookies) {
    token = req.cookies['token'];
  }

  console.log('Raw Auth Token Received in Backend:', token);

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado: Token de autenticación no proporcionado.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 1. Query activeSessions to verify the session is still active and has not been revoked
    const sessionRes = await query(
      'SELECT "isActive" FROM "activeSessions" WHERE "tokenJti" = $1',
      [decoded.tokenJti]
    );

    if ((sessionRes.rowCount ?? 0) === 0 || !sessionRes.rows[0].isActive) {
      res.status(401).json({ 
        error: 'Sesión revocada: Su sesión ha sido finalizada por un administrador o ha expirado.' 
      });
      return;
    }

    // 2. Build the authenticated user object
    const userPayload: any = {
      id: decoded.id,
      email: decoded.email,
      userType: decoded.userType,
      patientId: decoded.patientId,
      employeeId: decoded.employeeId,
      tokenJti: decoded.tokenJti
    };

    // 3. If the user is an employee, fetch their clinic role, department, and display name for downstream RBAC
    if (decoded.userType === 'employee' && decoded.employeeId) {
      const empRes = await query(
        'SELECT "clinicRole", "displayName", "department" FROM "employees" WHERE id = $1',
        [decoded.employeeId]
      );
      if (empRes.rowCount && empRes.rowCount > 0) {
        userPayload.clinicRole = empRes.rows[0].clinicRole;
        userPayload.displayName = empRes.rows[0].displayName;
        userPayload.department = empRes.rows[0].department;
      }
    } else if (decoded.userType === 'admin') {
      userPayload.displayName = 'Súper Administrador';
    } else if (decoded.userType === 'patient' && decoded.patientId) {
      const patRes = await query(
        'SELECT "displayName" FROM "patients" WHERE id = $1',
        [decoded.patientId]
      );
      if (patRes.rowCount && patRes.rowCount > 0) {
        userPayload.displayName = patRes.rows[0].displayName;
      }
    }

    (req as AuthenticatedRequest).user = userPayload;
    next();
  } catch (error) {
    console.error('Auth middleware error detailed:', error);
    res.status(403).json({ error: 'Token inválido o expirado. Por favor, inicie sesión de nuevo.' });
  }
}

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param allowedTypes Array of allowed userTypes ('patient', 'employee', 'admin')
 * @param allowedClinicRoles Array of allowed employee clinicRoles ('doctor', 'nurse', etc.)
 */
export function authorizeRoles(
  allowedTypes: ('patient' | 'employee' | 'admin')[],
  allowedClinicRoles?: ('doctor' | 'nurse' | 'administrative' | 'maintenance' | 'hr' | 'executive')[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    const { userType, clinicRole } = authReq.user;

    // Admin has absolute power (bypass normal role restrictions if they are Admin)
    if (userType === 'admin') {
      next();
      return;
    }

    // Check if the overall userType is allowed
    const isTypeAllowed = allowedTypes.includes(userType);
    
    // If the user is an employee, verify if their clinicRole is permitted
    if (userType === 'employee') {
      const isRoleAllowed = !allowedClinicRoles || (clinicRole && allowedClinicRoles.includes(clinicRole));
      if (isTypeAllowed && isRoleAllowed) {
        next();
        return;
      }
    } else if (isTypeAllowed) {
      next();
      return;
    }

    res.status(403).json({ 
      error: 'Acceso prohibido: Su cuenta no cuenta con los privilegios necesarios para realizar esta acción.' 
    });
  };
}
