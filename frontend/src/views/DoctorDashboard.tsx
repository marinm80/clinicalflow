import React, { useState, useEffect } from 'react';
import { Calendar, Search, FileText, Plus, ShieldCheck, Heart, User, Check } from 'lucide-react';

interface DoctorDashboardProps {
  user: any;
  activeTab: string;
}

export default function DoctorDashboard({ user, activeTab }: DoctorDashboardProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Patient Clinical profile
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Add Diagnosis form state
  const [newDiscipline, setNewDiscipline] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Cancellation Modal state (for doctor cancelling an app)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch appointments
      const appRes = await fetch('http://localhost:5001/api/appointments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const appData = await appRes.json();
      if (!appRes.ok) throw new Error(appData.error || 'Fallo al cargar las citas.');
      setAppointments(appData);

      // Fetch all patients (for Search tool)
      const patRes = await fetch('http://localhost:5001/api/patients', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const patData = await patRes.json();
      if (!patRes.ok) throw new Error(patData.error || 'Fallo al cargar pacientes.');
      setPatients(patData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    // Default discipline prepopulation
    if (user.department === 'Medical' && user.clinicRole === 'doctor' && user.displayName) {
      // Find doctor specialty in employees (we'll fetch it or default to doctor specialty!)
      // Simply default newDiscipline to Cardilogía or Pediatría based on department/role
      setNewDiscipline(user.displayName.includes('Pérez') ? 'Cardiología' : 'Pediatría');
    }
  }, [user]);

  // Load Patient Clinical history (decrypts in backend and audits access)
  const loadClinicalHistory = async (patient: any) => {
    setSelectedPatient(patient);
    setDiagLoading(true);
    setDiagError(null);
    setFormSuccess(null);
    setFormError(null);
    setNewDiagnosis('');
    setNewNotes('');

    try {
      const response = await fetch(`http://localhost:5001/api/diagnoses/patient/${patient.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fallo al cargar expediente.');
      setDiagnoses(data);
    } catch (err: any) {
      setDiagError(err.message);
    } finally {
      setDiagLoading(false);
    }
  };

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!newDiscipline || !newDiagnosis || !newNotes) {
      setFormError('Todos los campos clínicos son requeridos.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch('http://localhost:5001/api/diagnoses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          discipline: newDiscipline,
          diagnosis: newDiagnosis,
          clinicalNotes: newNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el diagnóstico.');
      }

      setFormSuccess('Diagnóstico cifrado y guardado con éxito en PostgreSQL.');
      setNewDiagnosis('');
      setNewNotes('');
      // Reload history
      loadClinicalHistory(selectedPatient);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

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
      setModalError('El motivo debe tener al menos 10 caracteres.');
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
          cancelledBy: 'doctor',
          cancellationReason: cancelReason.trim(),
          reason: cancelReason.trim() // Audit middleware requirement!
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Error al cancelar la cita.');

      setShowCancelModal(false);
      fetchDoctorData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPatients = patients.filter(p => 
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.identityNumber.includes(searchQuery)
  );

  return (
    <div className="animate-fade-in-up">
      {/* 1. Mi Agenda Tab view */}
      {activeTab === 'doctor-agenda' && (
        <div className="flex flex-col gap-6">
          <div className="page-header">
            <div>
              <h1 className="page-title">Mi Agenda de Consultas</h1>
              <p className="page-subtitle">Visualiza y controla tus turnos diarios del consultorio.</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center p-10 text-secondary">Cargando agenda médica...</div>
          ) : error ? (
            <div className="alert alert-danger text-center justify-center">{error}</div>
          ) : appointments.length === 0 ? (
            <div className="table-container p-12 text-center text-secondary flex flex-col items-center justify-center gap-3">
              <Calendar size={48} className="text-muted mx-auto" />
              <div>No tienes ninguna cita asignada para hoy.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Teléfono</th>
                    <th>Horario</th>
                    <th>Motivo de Consulta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((app) => (
                    <tr key={app.id}>
                      <td className="font-semibold">{app.patientName}</td>
                      <td>{app.patientPhone}</td>
                      <td className="text-xs font-semibold text-primary">{formatDate(app.startTime)}</td>
                      <td>{app.reason}</td>
                      <td>
                        <span className={`badge badge-${app.status}`}>
                          {app.status === 'scheduled' ? 'Programada' : app.status === 'completed' ? 'Completada' : 'Cancelada'}
                        </span>
                      </td>
                      <td>
                        {app.status === 'scheduled' ? (
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-secondary text-xs px-3 py-1.5" 
                              onClick={() => {
                                // Find full patient record
                                const p = patients.find(pat => pat.id === app.patientId);
                                if (p) {
                                  // Load in search tab
                                  loadClinicalHistory(p);
                                }
                              }}
                            >
                              Ficha Médica
                            </button>
                            <button 
                              className="btn btn-danger text-xs px-3 py-1.5" 
                              onClick={() => openCancelModal(app.id)}
                            >
                              Cancelar
                            </button>
                          </div>
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
      )}

      {/* 2. Buscador Clínico & Expedientes Tab view */}
      {activeTab === 'doctor-expedientes' && (
        <div className="flex flex-col gap-6">
          <div className="page-header">
            <div>
              <h1 className="page-title">Buscador de Pacientes & Expediente Clínico</h1>
              <p className="page-subtitle">Acceso encriptado y auditado a diagnósticos e historias clínicas.</p>
            </div>
          </div>

          <div className="grid gap-[30px]" style={{ gridTemplateColumns: selectedPatient ? '1fr 1fr' : '1fr' }}>
            {/* Left Column: Patient Search List */}
            <div>
              <div className="search-container mb-6">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar paciente por Nombre o Identificación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-secondary text-sm">Cargando base de pacientes...</div>
              ) : (
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Identificación</th>
                        <th>Nombre Completo</th>
                        <th>Contacto</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((pat) => (
                        <tr key={pat.id} className={selectedPatient?.id === pat.id ? 'bg-[rgba(139, 92, 246, 0.08)]' : ''}>
                          <td className="font-semibold text-xs text-primary">{pat.identityNumber}</td>
                          <td>{pat.displayName}</td>
                          <td className="text-xs text-secondary">{pat.phone}</td>
                          <td>
                            <button 
                              className="btn btn-primary text-xs px-3 py-1.5"
                              onClick={() => loadClinicalHistory(pat)}
                            >
                              Ver Ficha
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Encrypted Clinical History & Register Diagnosis Form */}
            {selectedPatient && (
              <div className="flex flex-col gap-[30px]">
                {/* Clinical History List */}
                <div className="stat-card stat-card-success bg-[rgba(17,24,39,0.85)]">
                  <div className="flex justify-between items-center border-b border-border-color pb-3 mb-4">
                    <div className="flex items-center gap-2 font-bold text-[1.1rem]">
                      <User size={18} className="text-success" />
                      Expediente de: {selectedPatient.displayName}
                    </div>
                    <span className="text-xs px-2 py-1 bg-[rgba(16,185,129,0.15)] text-[#34D399] rounded flex items-center gap-1">
                      <ShieldCheck size={14} /> Acceso Auditado
                    </span>
                  </div>

                  {diagLoading ? (
                    <div className="text-center p-5 text-secondary">Descifrando expediente clínico de forma segura...</div>
                  ) : diagError ? (
                    <div className="alert alert-danger mb-0 justify-center">{diagError}</div>
                  ) : diagnoses.length === 0 ? (
                    <div className="text-muted text-sm p-4 text-center">
                      No se registran diagnósticos clínicos previos para este paciente.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
                      {diagnoses.map((diag) => (
                        <div key={diag.id} className="p-4 bg-[rgba(255,255,255,0.02)] border border-border-color rounded-xl">
                          <div className="flex justify-between mb-2 text-xs">
                            <span className="font-semibold text-primary">{diag.discipline}</span>
                            <span className="text-muted">{new Date(diag.diagnosisDate).toLocaleDateString()}</span>
                          </div>
                          <div className="font-semibold text-sm mb-1.5 text-primary">
                            Diagnóstico: {diag.diagnosis}
                          </div>
                          <div className="text-xs text-secondary">
                            Notas Médicas: {diag.clinicalNotes}
                          </div>
                          <div className="mt-2 text-xs text-muted border-t border-dotted border-border-color pt-1.5">
                            Registrado por: {diag.doctorName} ({diag.doctorSpecialty})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Diagnosis Form */}
                <div className="stat-card stat-card-primary">
                  <h3 className="text-[1.05rem] font-bold border-b border-border-color pb-3 mb-4">
                    Registrar Nuevo Diagnóstico
                  </h3>

                  {formError && (
                    <div className="alert alert-danger mb-4 justify-center">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="alert alert-success mb-4 justify-center">
                      <Check size={16} /> {formSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAddDiagnosis}>
                    <div className="form-group">
                      <label className="form-label">Disciplina / Especialidad</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={newDiscipline}
                        onChange={(e) => setNewDiscipline(e.target.value)}
                        placeholder="Ej: Cardiología, Pediatría"
                        disabled={formLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Diagnóstico Clínico</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={newDiagnosis}
                        onChange={(e) => setNewDiagnosis(e.target.value)}
                        placeholder="Ej: Hipertensión esencial grado I o Gripe común."
                        disabled={formLoading}
                      />
                    </div>

                    <div className="form-group mb-5">
                      <label className="form-label">Observaciones y Notas Médicas</label>
                      <textarea 
                        className="form-textarea" 
                        rows={3}
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="Detalles sobre el tratamiento recetado, dosis o cuidados recomendados..."
                        disabled={formLoading}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={formLoading}>
                      {formLoading ? 'Cifrando y Guardando...' : 'Guardar Diagnóstico Cifrado'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compulsory Audit Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Justificar Cancelación (Médico)</h2>
              <div className="text-xs text-secondary mt-1">
                Debe proporcionar la justificación de cancelación para la auditoría de cambios.
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
                  placeholder="Por favor, explique la razón (mínimo 10 caracteres)... Ej: Emergencia en urgencias o reprogramación acordada."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={modalLoading}
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Auditoría de cambios obligatoria</span>
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
                  {modalLoading ? 'Confirmando...' : 'Cancelar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
