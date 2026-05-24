import { describe, it, expect, beforeAll } from 'vitest';
import { query } from '../src/config/db';
import { encrypt, decrypt } from '../src/utils/crypto';

describe('ClinicalFlow Integration & Security Test Suite', () => {
  
  beforeAll(async () => {
    // Clean-up any test residues before starting
    await query('DELETE FROM "appointments" WHERE reason = \'TEST CITA OVERLAP\'');
    await query('DELETE FROM "patientDoctors" WHERE "patientId" = \'b3333333-3333-3333-3333-333333333333\'');
  });

  // 1. AES-256-GCM Encryption Tests
  describe('T-004: AES-256-GCM Cifrado de Datos de Salud', () => {
    it('Debe cifrar y descifrar texto clínico sensible recuperando exactamente el valor original', () => {
      const sensitiveText = 'Paciente diagnosticado con soplo cardíaco severo, requiere ecocardiograma urgente.';
      const cipherText = encrypt(sensitiveText);

      // Verify AES-256-GCM Gherkin standard format: "iv:authTag:cipher"
      expect(cipherText).toContain(':');
      expect(cipherText.split(':')).toHaveLength(3);

      const decryptedText = decrypt(cipherText);
      expect(decryptedText).toBe(sensitiveText);
    });

    it('Debe fallar de forma segura al intentar descifrar un texto alterado', () => {
      const cipherText = encrypt('Nota médica secreta');
      const corruptedText = cipherText + 'tampered';
      
      expect(() => decrypt(corruptedText)).toThrow();
    });
  });

  // 2. PostgreSQL Physical Constraints & Triggers
  describe('T-002: PostgreSQL Constraints & Reglas de Negocio', () => {
    
    it('Exclusión Física de Citas (DB-01): Debe impedir que el Dr. Juan Pérez tenga dos citas solapadas mediante restricción física exclude_appointment_overlap', async () => {
      const doctorId = 'e1111111-1111-1111-1111-111111111111'; // Dr. Juan Pérez (Cardiologist)
      const patientId1 = 'b1111111-1111-1111-1111-111111111111'; // Pedro Infante
      const patientId2 = 'b2222222-2222-2222-2222-222222222222'; // Isabel Pantoja

      const start1 = new Date('2027-06-01T10:00:00Z');
      const end1 = new Date('2027-06-01T10:30:00Z');

      // Insert first appointment
      const app1 = await query(
        `INSERT INTO "appointments" ("doctorId", "patientId", "startTime", "endTime", reason, status) 
         VALUES ($1, $2, $3, $4, 'TEST CITA OVERLAP', 'scheduled') 
         RETURNING id`,
        [doctorId, patientId1, start1.toISOString(), end1.toISOString()]
      );
      
      const appId1 = app1.rows[0].id;
      expect(appId1).toBeDefined();

      // Attempt to insert a colliding appointment (10:15 - 10:45)
      const start2 = new Date('2027-06-01T10:15:00Z');
      const end2 = new Date('2027-06-01T10:45:00Z');

      try {
        await query(
          `INSERT INTO "appointments" ("doctorId", "patientId", "startTime", "endTime", reason, status) 
           VALUES ($1, $2, $3, $4, 'TEST CITA OVERLAP', 'scheduled')`,
          [doctorId, patientId2, start2.toISOString(), end2.toISOString()]
        );
        // If it doesn't throw, the test must fail
        expect('Overlap should have been blocked').toBe('Failed');
      } catch (err: any) {
        // Assert PostgreSQL physical exclusion constraint violation code (23P01)
        expect(err.code).toBe('23P01');
        expect(err.message).toContain('exclude_appointment_overlap');
      }

      // Clean up the first appointment
      await query('DELETE FROM "appointments" WHERE id = $1', [appId1]);
    });

    it('Médico de Cabecera Único (DB-02): Debe impedir registrar más de un médico primario de cabecera por paciente mediante uq_patient_primary_doctor', async () => {
      const patientId = 'b3333333-3333-3333-3333-333333333333'; // Alberto Cortez
      const docId1 = 'e1111111-1111-1111-1111-111111111111'; // Dr. Juan Pérez
      const docId2 = 'e2222222-2222-2222-2222-222222222222'; // Dra. María Gómez

      // Insert first primary care assignment
      await query(
        'INSERT INTO "patientDoctors" ("patientId", "doctorId", "relationshipType") VALUES ($1, $2, \'primary\')',
        [patientId, docId1]
      );

      // Attempt to insert second primary care doctor
      try {
        await query(
          'INSERT INTO "patientDoctors" ("patientId", "doctorId", "relationshipType") VALUES ($1, $2, \'primary\')',
          [patientId, docId2]
        );
        expect('Second primary doctor should have failed').toBe('Failed');
      } catch (err: any) {
        // Assert PostgreSQL unique index violation code (23505)
        expect(err.code).toBe('23505');
        expect(err.message).toContain('uq_patient_primary_doctor');
      }

      // Clean up
      await query('DELETE FROM "patientDoctors" WHERE "patientId" = $1', [patientId]);
    });

    it('Validación de Rol Clínico (trg_validate_appointment_doctor): Debe impedir registrar citas con empleados que no sean doctores', async () => {
      const nurseId = 'e3333333-3333-3333-3333-333333333333'; // Nurse Ana Martínez
      const patientId = 'p1111111-1111-1111-1111-111111111111'; // Pedro Infante
      const start = new Date('2027-06-02T12:00:00Z');
      const end = new Date('2027-06-02T12:30:00Z');

      try {
        await query(
          `INSERT INTO "appointments" ("doctorId", "patientId", "startTime", "endTime", reason, status) 
           VALUES ($1, $2, $3, $4, 'TEST ROLE ERROR', 'scheduled')`,
          [nurseId, patientId, start.toISOString(), end.toISOString()]
        );
        expect('Nurse appointment booking should have failed').toBe('Failed');
      } catch (err: any) {
        expect(err.code).toBe('45002');
        expect(err.message).toContain('no posee el rol clínico de doctor');
      }
    });
  });

  // 3. Security Hardening Tests (HIPAA / GDPR)
  describe('Fase 2: Pruebas de Endurecimiento de Seguridad', () => {

    it('Inmutabilidad de Auditoría (DB-03): Debe garantizar que las tablas de logs auditables rechacen UPDATES y DELETES', async () => {
      const userId = 'u1111111-1111-1111-1111-111111111111'; // Súper Administrador
      const patientId = 'p1111111-1111-1111-1111-111111111111'; // Pedro Infante
      
      const insertRes = await query(
        `INSERT INTO "sensitiveAuditLogs" ("userId", "patientId", action, details) 
         VALUES ($1, $2, 'TEST_READ', 'Consulta de expediente de prueba') 
         RETURNING id`,
        [userId, patientId]
      );
      
      const logId = insertRes.rows[0].id;
      expect(logId).toBeDefined();

      // Attempt to modify the log
      try {
        await query(
          'UPDATE "sensitiveAuditLogs" SET details = \'Fuga de datos intencional\' WHERE id = $1',
          [logId]
        );
        expect('Audit log update should have been blocked').toBe('Failed');
      } catch (err: any) {
        expect(err.code).toBe('45005');
        expect(err.message).toContain('Los registros de auditoría son estrictamente inmutables');
      }

      // Attempt to delete the log
      try {
        await query(
          'DELETE FROM "sensitiveAuditLogs" WHERE id = $1',
          [logId]
        );
        expect('Audit log delete should have been blocked').toBe('Failed');
      } catch (err: any) {
        expect(err.code).toBe('45005');
        expect(err.message).toContain('Los registros de auditoría son estrictamente inmutables');
      }
    });

    it('Sanitización XSS (V-01): Debe remover scripts maliciosos de notas médicas', () => {
      const { sanitize } = require('../src/utils/validation');
      
      const maliciousScript = '<script>alert("XSS")</script>Paciente en observación clínica.';
      const cleaned = sanitize(maliciousScript);
      
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('alert');
      expect(cleaned).toBe('Paciente en observación clínica.');
    });

    it('Complejidad de Contraseña (V-02): Debe validar contraseñas seguras bajo complejidad NIST', () => {
      const { PasswordValidator } = require('../src/utils/validation');

      // Too short
      const weak1 = PasswordValidator.safeParse('123abcABC!');
      expect(weak1.success).toBe(false);

      // Missing special character
      const weak2 = PasswordValidator.safeParse('ClinicalFlow2026');
      expect(weak2.success).toBe(false);

      // Missing uppercase
      const weak3 = PasswordValidator.safeParse('clinicalflow-2026!');
      expect(weak3.success).toBe(false);

      // Strong compliant password
      const strong = PasswordValidator.safeParse('ClinicalFlow-2026!');
      expect(strong.success).toBe(true);
    });

    it('Formulario sin Números (V-01): Debe rechazar nombres o apellidos con números', () => {
      const { PatientValidator } = require('../src/utils/validation');

      const invalidPatient = {
        firstName: 'María123',
        lastName: 'Gómez',
        identityNumber: 'DNI12345678A',
        email: 'maria.gomez@gmail.com',
        phone: '+34600123456'
      };

      const result = PatientValidator.safeParse(invalidPatient);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('El nombre contiene números o caracteres especiales');
    });
  });
});
