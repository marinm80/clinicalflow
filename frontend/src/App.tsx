import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Login from './views/Login';
import Sidebar from './components/Sidebar';
import PatientDashboard from './views/PatientDashboard';
import DoctorDashboard from './views/DoctorDashboard';
import AdminDashboard from './views/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  // Initial tab select depending on user role
  const selectDefaultTab = (userData: any) => {
    if (userData.userType === 'patient') {
      setActiveTab('patient-agenda');
    } else if (userData.userType === 'employee') {
      if (userData.clinicRole === 'doctor') {
        setActiveTab('doctor-agenda');
      } else if (userData.clinicRole === 'hr') {
        setActiveTab('hr-employees');
      } else {
        // Administrative or nurse
        setActiveTab('admin-agenda');
      }
    } else if (userData.userType === 'admin') {
      setActiveTab('admin-agenda');
    }
  };

  const handleLoginSuccess = (userData: any) => {
    if (userData && userData.token) {
      localStorage.setItem('token', userData.token);
    }
    setUser(userData);
    selectDefaultTab(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5001/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Fallback, but standard
        }
      });
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    
    // Clear cookies/localStorage and reset state
    setUser(null);
    setActiveTab('');
    localStorage.removeItem('token');
  };

  const handleCleanMockData = async () => {
    setLoading(true);
    setSeedStatus(null);
    try {
      const res = await fetch('http://localhost:5001/api/admin/clean-mock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSeedStatus('success-clean');
        setTimeout(() => {
          setShowSeedModal(false);
          window.location.reload();
        }, 2000);
      } else {
        setSeedStatus(data.error || 'Error al limpiar los datos ficticios.');
      }
    } catch (e) {
      setSeedStatus('Fallo al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMockData = async () => {
    setLoading(true);
    setSeedStatus(null);
    try {
      const res = await fetch('http://localhost:5001/api/admin/generate-mock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSeedStatus('success-generate');
        setTimeout(() => {
          setShowSeedModal(false);
          window.location.reload();
        }, 2000);
      } else {
        setSeedStatus(data.error || 'Error al generar los datos de prueba.');
      }
    } catch (e) {
      setSeedStatus('Fallo al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Sync token from body return for testing purposes
  useEffect(() => {
    if (user && user.token) {
      localStorage.setItem('token', user.token);
    }
  }, [user]);

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    if (user.userType === 'patient') {
      return <PatientDashboard user={user} />;
    }

    if (user.userType === 'employee' && user.clinicRole === 'doctor') {
      return <DoctorDashboard user={user} activeTab={activeTab} />;
    }

    // Admins, HR managers, and administrative employees share the modular AdminDashboard view
    return <AdminDashboard user={user} activeTab={activeTab} />;
  };

  return (
    <BrowserRouter>
      <div className="dashboard-layout">
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout} 
        />
        <div className="main-content">
          {renderContent()}
        </div>
      </div>

      {user && user.userType === 'admin' && (
        <>
          <div 
            className="floating-seed-trigger" 
            onClick={() => {
              setShowSeedModal(true);
              setSeedStatus(null);
            }}
            title="Controles de Datos de Prueba (Semillas)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '28px', height: '28px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </div>

          {showSeedModal && (
            <div className="modal-overlay" onClick={() => !loading && setShowSeedModal(false)}>
              <div className="modal-content seed-panel-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Controles de Datos (Semillas)</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px' }}>
                    Gestione la base de datos de ClinicalFlow. Puede repoblar 100 pacientes ficticios o limpiar el sistema para comenzar en producción.
                  </p>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {seedStatus === 'success-clean' && (
                    <div className="alert alert-success">
                      ✓ Todos los datos ficticios fueron eliminados. Recargando...
                    </div>
                  )}
                  {seedStatus === 'success-generate' && (
                    <div className="alert alert-success">
                      ✓ 100 pacientes de prueba generados. Recargando...
                    </div>
                  )}
                  {seedStatus && seedStatus !== 'success-clean' && seedStatus !== 'success-generate' && (
                    <div className="alert alert-danger">
                      ✕ {seedStatus}
                    </div>
                  )}

                  <button 
                    className="seed-btn-action btn-primary" 
                    onClick={handleGenerateMockData}
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {loading ? 'Generando...' : 'Generar 100 Pacientes Ficticios'}
                  </button>

                  <button 
                    className="seed-btn-action btn-danger" 
                    onClick={handleCleanMockData}
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 12m-4.72 0-.34-12M4.5 18.062V17c0-1.018.822-1.838 1.84-1.838h11.32c1.018 0 1.84.82 1.84 1.838v1.062c0 1.018-.822 1.84-1.84 1.84H6.34c-1.018 0-1.84-.822-1.84-1.84V17.062ZM9 3.75h6m-9 3.5h12M12 9.75v6" />
                    </svg>
                    {loading ? 'Limpiando...' : 'Limpiar Todo (Comenzar de Cero)'}
                  </button>
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setShowSeedModal(false)}
                    disabled={loading}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </BrowserRouter>
  );
}
