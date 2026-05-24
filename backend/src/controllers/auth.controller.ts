import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforclinicalflow123';
const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Por favor, proporcione un correo y contraseña.' });
    return;
  }

  try {
    // 1. Fetch user from database
    const userRes = await query(
      'SELECT * FROM "users" WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if ((userRes.rowCount ?? 0) === 0) {
      res.status(401).json({ error: 'Credenciales inválidas: Correo o contraseña incorrectos.' });
      return;
    }

    const user = userRes.rows[0];

    // 2. Validate password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      res.status(401).json({ error: 'Credenciales inválidas: Correo o contraseña incorrectos.' });
      return;
    }

    // 3. Resolve displayName, clinicRole, etc., for the authenticated entity
    let displayName = 'Usuario';
    let clinicRole = undefined;
    let department = undefined;

    if (user.userType === 'admin') {
      displayName = 'Súper Administrador';
    } else if (user.userType === 'employee' && user.employeeId) {
      const empRes = await query(
        'SELECT "firstName", "lastName", "displayName", "clinicRole", "department" FROM "employees" WHERE id = $1',
        [user.employeeId]
      );
      if (empRes.rowCount && empRes.rowCount > 0) {
        displayName = empRes.rows[0].displayName;
        clinicRole = empRes.rows[0].clinicRole;
        department = empRes.rows[0].department;
      }
    } else if (user.userType === 'patient' && user.patientId) {
      const patRes = await query(
        'SELECT "firstName", "lastName", "displayName" FROM "patients" WHERE id = $1',
        [user.patientId]
      );
      if (patRes.rowCount && patRes.rowCount > 0) {
        displayName = patRes.rows[0].displayName;
      }
    }

    // 4. Provision a unique Session in activeSessions
    const tokenJti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS);
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    await query(
      'INSERT INTO "activeSessions" ("userId", "tokenJti", "ipAddress", "userAgent", "expiresAt") VALUES ($1, $2, $3, $4, $5)',
      [user.id, tokenJti, ipAddress, userAgent, expiresAt]
    );

    // 5. Generate signed JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      patientId: user.patientId,
      employeeId: user.employeeId,
      tokenJti
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // 6. Set token in secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRATION_MS
    });

    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      token, // Also return in body for absolute flexibility (e.g. testing)
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        patientId: user.patientId,
        employeeId: user.employeeId,
        displayName,
        clinicRole,
        department,
        token
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Ha ocurrido un error inesperado en el servidor.' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(400).json({ error: 'No se encuentra autenticado.' });
    return;
  }

  try {
    // Invalidate session in database
    await query(
      'UPDATE "activeSessions" SET "isActive" = FALSE WHERE "tokenJti" = $1',
      [authReq.user.tokenJti]
    );

    // Clear client-side cookie
    res.clearCookie('token');
    res.status(200).json({ message: 'Sesión cerrada con éxito.' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Error al procesar el cierre de sesión.' });
  }
}

export function me(req: Request, res: Response): void {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  res.status(200).json({ user: authReq.user });
}
