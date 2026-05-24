import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface PatientDashboardProps {
  user: any;
}

export default function PatientDashboard({ user }: PatientDashboardProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audit Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/appointments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fallo al cargar las citas.');
      setAppointments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const openCancelModal = (appId: string) => {
    setSelectedAppId(appId);
    setCancelReason('');
    setModalError(null);
    setShowCancelModal(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;

    if (cancelReason.trim().length < 10) {
      setModalError('La razón de cancelación debe tener al menos 10 caracteres.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const response = await fetch(`http://localhost:5001/api/appointments/${selectedAppId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'cancelled',
          cancelledBy: 'patient',
          cancellationReason: cancelReason.trim(),
          reason: cancelReason.trim() // Reason for systemChangeLogs audit middleware!
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar la cita.');
      }

      setShowCancelModal(false);
      fetchAppointments(); // Reload list
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeAppointments = appointments.filter(a => a.status === 'scheduled');
  const nextApp = activeAppointments.length > 0 ? activeAppointments[0] : null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bienvenido de nuevo, {user.displayName}</h1>
          <p className="page-subtitle">Visualiza y gestiona tu historial de consultas médicas.</p>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Mis Citas Totales</div>
          <div className="stat-value">{appointments.length}</div>
          <div className="stat-desc">Historial completo en ClinicalFlow</div>
        </div>
        <div className="stat-card stat-card-primary">
          <div className="stat-title">Citas Activas</div>
          <div className="stat-value">{activeAppointments.length}</div>
          <div className="stat-desc">Próximas visitas agendadas</div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-title">Siguiente Cita</div>
          <div className="text-[1.15rem] font-semibold mt-2">
            {nextApp ? (
              <div>
                <div>{nextApp.doctorName}</div>
                <div className="text-primary text-xs font-semibold mt-1">{formatDate(nextApp.startTime)}</div>
              </div>
            ) : (
              <span className="text-muted text-sm">Ninguna cita programada</span>
            )}
          </div>
          <div className="stat-desc mt-1">Especialidad asignada</div>
        </div>
      </div>

      {/* Appointments List */}
      <div>
        <h2 className="text-[1.4rem] font-bold mb-5">Mis Citas Programadas e Históricas</h2>

        {loading ? (
          <div className="text-center p-10 text-secondary">Cargando agenda médica...</div>
        ) : error ? (
          <div className="alert alert-danger text-center justify-center">{error}</div>
        ) : appointments.length === 0 ? (
          <div className="table-container p-12 text-center text-secondary flex flex-col items-center justify-center gap-3">
            <Calendar size={48} className="text-muted mx-auto" />
            <div>No tienes ninguna cita médica programada en el sistema.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Médico</th>
                  <th>Especialidad</th>
                  <th>Fecha y Hora</th>
                  <th>Motivo de Consulta</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id}>
                    <td className="font-semibold">{app.doctorName}</td>
                    <td>{app.doctorSpecialty}</td>
                    <td className="text-xs font-semibold text-primary">{formatDate(app.startTime)}</td>
                    <td>{app.reason}</td>
                    <td>
                      <span className={`badge badge-${app.status}`}>
                        {app.status === 'scheduled' ? 'Programada' : app.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td>
                      {app.status === 'scheduled' ? (
                        <button 
                          className="btn btn-danger text-xs px-3 py-1.5" 
                          onClick={() => openCancelModal(app.id)}
                        >
                          Cancelar Cita
                        </button>
                      ) : app.status === 'cancelled' && app.cancellationReason ? (
                        <span 
                          className="text-xs text-muted block max-w-[200px] truncate" 
                          title={app.cancellationReason}
                        >
                          Motivo: {app.cancellationReason}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compulsory Audit Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Justificar Cancelación de Cita</h2>
              <div className="text-xs text-secondary mt-1">
                De acuerdo con la política clínica, es obligatorio detallar el motivo del cambio.
              </div>
            </div>

            {modalError && (
              <div className="alert alert-danger mb-4 justify-center">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit}>
              <div className="form-group">
                <label className="form-label">Motivo de Cancelación</label>
                <textarea 
                  className="form-textarea" 
                  rows={4}
                  placeholder="Por favor, explique la razón (mínimo 10 caracteres)... Ej: Viaje familiar o cita de trabajo imprevista."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={modalLoading}
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Requerido para auditoría clínica</span>
                  <span>{cancelReason.length} / 10 caracteres</span>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCancelModal(false)}
                  disabled={modalLoading}
                >
                  Cerrar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  disabled={modalLoading || cancelReason.trim().length < 10}
                >
                  {modalLoading ? 'Guardando Auditoría...' : 'Cancelar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
