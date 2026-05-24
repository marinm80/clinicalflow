import { Pool } from 'pg';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'clinicalflow',
});

// Event listeners for connection monitoring
pool.on('connect', () => {
  console.log('PostgreSQL database pool connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export default pool;
export const query = (text: string, params?: any[]) => pool.query(text, params);
