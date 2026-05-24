import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce a mandatory, meaningful justification (reason) on all UPDATE and DELETE operations.
 * If the reason is missing or shorter than 10 characters, the request is immediately rejected.
 */
export function requireAuditReason(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;

  // Intercept all PUT, PATCH, and DELETE requests
  if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      res.status(400).json({
        error: 'Operación rechazada: Es obligatorio proveer una justificación (motivo) de al menos 10 caracteres para editar o eliminar cualquier registro del sistema.'
      });
      return;
    }
  }

  next();
}
