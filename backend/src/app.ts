import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import appointmentRoutes from './routes/appointment.routes';
import diagnosisRoutes from './routes/diagnosis.routes';
import adminRoutes from './routes/admin.routes';
import patientRoutes from './routes/patient.routes';

// Load environment variables from env.config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Read allowed origins from environment or use secure local defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173'];

// CORS setup with strict whitelist and credential support (HTTP-only cookies)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, and local integration tests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por políticas CORS de ClinicalFlow.'));
    }
  },
  credentials: true
}));

app.use(cookieParser()); // Native, robust cookie parser to prevent JWT truncation errors
app.use(express.json());

// Main API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);

// Simple health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date(), uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`ClinicalFlow Backend server successfully booted and listening on port ${PORT}`);
});

export default app;
