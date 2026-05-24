import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, rellene todos los campos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fallo de autenticación.');
      }

      const userWithToken = { ...data.user, token: data.token };
      onLoginSuccess(userWithToken);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          🩺 ClinicalFlow
        </div>
        <div className="login-subtitle">
          Portal Clínico de Gestión y Recursos Humanos
        </div>

        {error && (
          <div className="alert alert-danger text-center justify-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="correo@clinicalflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3.5" 
            disabled={loading}
          >
            {loading ? 'Accediendo al Portal...' : 'Acceder al Portal'}
          </button>
        </form>

        {/* Dynamic Cues: Quick Login Buttons to ease manual testing */}
        <div className="quick-login-section">
          <div className="quick-login-title">
            Acceso Rápido para Testing
          </div>
          <div className="quick-login-grid">
            <button 
              className="quick-login-btn" 
              onClick={() => handleQuickLogin('admin@clinicalflow.com')}
            >
              🔑 Administrador
            </button>
            <button 
              className="quick-login-btn" 
              onClick={() => handleQuickLogin('juan.perez@clinicalflow.com')}
            >
              🩺 Médico (Cardio)
            </button>
            <button 
              className="quick-login-btn" 
              onClick={() => handleQuickLogin('carlos.ruiz@clinicalflow.com')}
            >
              📅 Recepcionista
            </button>
            <button 
              className="quick-login-btn" 
              onClick={() => handleQuickLogin('pedro.infante@gmail.com')}
            >
              👤 Paciente
            </button>
            <button 
              className="quick-login-btn" 
              onClick={() => handleQuickLogin('ana.martinez@clinicalflow.com')}
            >
              💉 Enfermera
            </button>
            <button 
              className="quick-login-btn" 
              onClick={() => handleQuickLogin('laura.delgado@clinicalflow.com')}
            >
              📊 Recursos Humanos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
