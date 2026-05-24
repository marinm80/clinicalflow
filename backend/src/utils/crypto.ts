import crypto from 'crypto';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const ENCRYPTION_KEY = process.env.CLINICAL_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard IV length is 12 bytes
const SALT = process.env.CLINICAL_ENCRYPTION_SALT || 'clinicalflow-salt-987';

if (!ENCRYPTION_KEY) {
  throw new Error('FATAL: La variable de entorno CLINICAL_ENCRYPTION_KEY es obligatoria para arrancar ClinicalFlow.');
}

// Derive a secure 32-byte key from the ENCRYPTION_KEY
let keyBuffer: Buffer;
try {
  if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
    keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  } else {
    keyBuffer = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);
  }
} catch (e) {
  console.error('Error catastrófico en la derivación de clave criptográfica:', e);
  throw new Error('FATAL: Fallo al derivar la clave criptográfica. Revise CLINICAL_ENCRYPTION_KEY.');
}

/**
 * Encrypts clear text using AES-256-GCM
 * @param text The plain text to encrypt
 * @returns Formatted cipher text string "iv:authTag:encryptedHex"
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts GCM cipher text back to plain text
 * @param cipherText Formatted cipher text string "iv:authTag:encryptedHex"
 * @returns Plain text string
 */
export function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de texto cifrado inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    // Pass undefined instead of 'hex' as input encoding when the input is a Buffer
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error de desencriptado:', error);
    throw new Error('Error al descifrar los datos de salud. La clave de cifrado podría ser incorrecta o el registro fue comprometido.');
  }
}
