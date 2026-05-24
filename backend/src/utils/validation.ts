import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

// Regular expressions for strict validation
// nameRegex: Allows only letters (including accents and Spanish characters), spaces, hyphens, and apostrophes. STRICTLY NO NUMBERS OR HTML.
const nameRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/;
const phoneRegex = /^\+?[0-9\s-]{7,20}$/;
const identityRegex = /^[a-zA-Z0-9-]+$/;

/**
 * Sanitizes input text, completely removing all HTML tags to prevent XSS.
 * @param input The raw input string
 * @returns Cleaned text
 */
export function sanitize(input: string): string {
  if (!input) return '';
  return sanitizeHtml(input.trim(), {
    allowedTags: [], // Strip all HTML tags completely
    allowedAttributes: {}, // Strip all attributes completely
  });
}

// Zod Schema for Patient Form Validation
export const PatientValidator = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder los 50 caracteres')
    .regex(nameRegex, 'El nombre contiene números o caracteres especiales no permitidos'),
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder los 50 caracteres')
    .regex(nameRegex, 'El apellido contiene números o caracteres especiales no permitidos'),
  identityNumber: z.string()
    .min(5, 'La identificación debe tener al menos 5 caracteres')
    .max(50, 'La identificación no puede exceder los 50 caracteres')
    .regex(identityRegex, 'La identificación solo permite caracteres alfanuméricos y guiones'),
  email: z.string()
    .email('Formato de correo electrónico inválido')
    .max(100, 'El correo electrónico no puede exceder los 100 caracteres'),
  phone: z.string()
    .regex(phoneRegex, 'Formato de número telefónico de paciente inválido')
});

// Zod Schema for Medical Diagnosis and Clinical History Validation (XSS Sanitized)
export const DiagnosisValidator = z.object({
  patientId: z.string().uuid('El ID de paciente debe ser un UUID válido'),
  discipline: z.string()
    .min(3, 'La disciplina debe tener al menos 3 caracteres')
    .max(100, 'La disciplina no puede exceder los 100 caracteres')
    .transform(val => sanitize(val)), // Automatically sanitize clinical inputs
  diagnosis: z.string()
    .min(5, 'El diagnóstico clínico debe ser descriptivo')
    .transform(val => sanitize(val)), // Automatically sanitize clinical inputs
  clinicalNotes: z.string()
    .min(5, 'Las notas clínicas deben contener detalles válidos')
    .transform(val => sanitize(val))  // Automatically sanitize clinical inputs
});

// GDPR & NIST Compliant Password Complexity Validator
export const PasswordValidator = z.string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula')
  .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'La contraseña debe incluir al menos un carácter especial');

// Zod Schema for Employee & HR Form Validation
export const EmployeeValidator = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder los 50 caracteres')
    .regex(nameRegex, 'El nombre contiene números o caracteres especiales no permitidos'),
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder los 50 caracteres')
    .regex(nameRegex, 'El apellido contiene números o caracteres especiales no permitidos'),
  email: z.string()
    .email('Formato de correo electrónico inválido')
    .max(100, 'El correo electrónico no puede exceder los 100 caracteres'),
  phone: z.string()
    .regex(phoneRegex, 'Formato de número telefónico de empleado inválido'),
  department: z.string()
    .min(2, 'El departamento debe tener al menos 2 caracteres')
    .max(50, 'El departamento no puede exceder los 50 caracteres'),
  clinicRole: z.enum(['doctor', 'nurse', 'administrative', 'maintenance', 'hr', 'executive'], {
    errorMap: () => ({ message: 'El rol clínico de empleado seleccionado es inválido.' })
  }),
  specialty: z.string().max(100).optional().nullable(),
  payrollNumber: z.string()
    .min(3, 'El número de nómina debe tener al menos 3 caracteres')
    .max(30, 'El número de nómina no puede exceder los 30 caracteres'),
  salary: z.union([z.number(), z.string()])
    .transform((val) => {
      const parsed = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(parsed) || parsed < 0) {
        throw new Error('El salario debe ser un número positivo.');
      }
      return parsed;
    }),
  workSchedule: z.string().max(100).optional().nullable(),
  hireDate: z.string().max(30).optional().nullable(),
  performanceRating: z.enum(['Excellent', 'Good', 'Average', 'Unsatisfactory']).optional().nullable(),
  hrNotes: z.string().optional().nullable().transform(val => val ? sanitize(val) : val),
  resumeExperience: z.string().optional().nullable().transform(val => val ? sanitize(val) : val),
  associatedDocuments: z.array(z.any()).optional().default([])
});
