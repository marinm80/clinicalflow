import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Database, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Key, 
  Download, 
  FolderPlus, 
  FileText,
  DollarSign,
  Briefcase,
  UserCheck
} from 'lucide-react';

interface AdminDashboardProps {
  user: any;
  activeTab: string;
}

export default function AdminDashboard({ user, activeTab }: AdminDashboardProps) {
  // Shared lists
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms state
  const [showAppModal, setShowAppModal] = useState(false);
  const [appDoctor, setAppDoctor] = useState('');
  const [appPatient, setAppPatient] = useState('');
  const [appStart, setAppStart] = useState('');
  const [appEnd, setAppEnd] = useState('');
  const [appReason, setAppReason] = useState('');

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empFirst, setEmpFirst] = useState('');
  const [empLast, setEmpLast] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('Medical');
  const [empRole, setEmpRole] = useState('doctor');
  const [empSpec, setEmpSpec] = useState('');
  const [empPayroll, setEmpPayroll] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empHire, setEmpHire] = useState('');
  const [empSched, setEmpSched] = useState('');
  const [empPass, setEmpPass] = useState('password123');

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patFirst, setPatFirst] = useState('');
  const [patLast, setPatLast] = useState('');
  const [patIdNum, setPatIdNum] = useState('');
  const [patEmail, setPatEmail] = useState('');
  const [patPhone, setPatPhone] = useState('');

  // Selected Employee profile (for HR details view)
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [showHrEdit, setShowHrEdit] = useState(false);
  const [hrRating, setHrRating] = useState('Good');
  const [hrNotes, setHrNotes] = useState('');
  const [hrResume, setHrResume] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');

  // Unified Audit Modal (for cancels/deletes/resets)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditAction, setAuditAction] = useState<'cancel' | 'delete' | 'reset-pass' | 'update-hr' | ''>('');
  const [auditTargetId, setAuditTargetId] = useState<string | null>(null);
  const [auditReason, setAuditReason] = useState('');
  const [auditPassword, setAuditPassword] = useState(''); // for password reset only
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load appointments
      if (['admin-agenda', 'hr-employees', 'admin-employees'].includes(activeTab)) {
        const appRes = await fetch('http://localhost:5001/api/appointments', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const appData = await appRes.json();
        setAppointments(appRes.ok ? appData : []);
      }

      // Load patients
      if (['admin-agenda', 'admin-patients', 'patients'].includes(activeTab)) {
        const patRes = await fetch('http://localhost:5001/api/patients', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const patData = await patRes.json();
        setPatients(patRes.ok ? patData : []);
      }

      // Load employees (HR roster)
      if (['admin-agenda', 'admin-employees', 'hr-employees'].includes(activeTab)) {
        const empRes = await fetch('http://localhost:5001/api/admin/employees', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const empData = await empRes.json();
        setEmployees(empRes.ok ? empData : []);
      }

      // Load sessions
      if (activeTab === 'admin-sessions') {
        const sessRes = await fetch('http://localhost:5001/api/admin/sessions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const sessData = await sessRes.json();
        setSessions(sessRes.ok ? sessData : []);
      }

      // Load backups
      if (activeTab === 'admin-backups') {
        const backRes = await fetch('http://localhost:5001/api/admin/backups', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const backData = await backRes.json();
        setBackups(backRes.ok ? backData : []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  // Book appointment
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appDoctor || !appPatient || !appStart || !appEnd || !appReason) {
      setError('Por favor, rellene todos los campos para programar.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          doctorId: appDoctor,
          patientId: appPatient,
          startTime: new Date(appStart).toISOString(),
          endTime: new Date(appEnd).toISOString(),
          reason: appReason.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al agendar cita.');

      setShowAppModal(false);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Register Patient
  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patFirst || !patLast || !patIdNum || !patEmail || !patPhone) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          firstName: patFirst,
          lastName: patLast,
          identityNumber: patIdNum,
          email: patEmail,
          phone: patPhone
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar paciente.');

      setShowPatientModal(false);
      setPatFirst('');
      setPatLast('');
      setPatIdNum('');
      setPatEmail('');
      setPatPhone('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Register Employee
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFirst || !empLast || !empEmail || !empPhone || !empDept || !empRole || !empPayroll || !empSalary || !empPass) {
      setError('Rellene todos los campos obligatorios del empleado.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          firstName: empFirst,
          lastName: empLast,
          email: empEmail,
          phone: empPhone,
          department: empDept,
          clinicRole: empRole,
          specialty: empSpec || null,
          payrollNumber: empPayroll,
          salary: parseFloat(empSalary),
          hireDate: empHire || new Date().toISOString().split('T')[0],
          workSchedule: empSched || null,
          password: empPass
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar empleado.');

      setShowEmpModal(false);
      setEmpFirst('');
      setEmpLast('');
      setEmpEmail('');
      setEmpPhone('');
      setEmpPayroll('');
      setEmpSalary('');
      setEmpSpec('');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Session Revocation trigger
  const handleRevoke = async (sessionId: string) => {
    if (!confirm('¿Está seguro de que desea desconectar forzadamente a este usuario?')) return;
    try {
      const response = await fetch(`http://localhost:5001/api/admin/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Generate backup pg_dump
  const handleGenerateBackup = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/admin/backups', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Unified Audit submission (cancellation, deletion, password reset, HR update)
  const openAuditModal = (action: 'cancel' | 'delete' | 'reset-pass' | 'update-hr', targetId: string) => {
    setAuditAction(action);
    setAuditTargetId(targetId);
    setAuditReason('');
    setAuditPassword('');
    setAuditError(null);
    setShowAuditModal(true);
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auditReason.trim().length < 10) {
      setAuditError('Es obligatorio detallar un motivo de al menos 10 caracteres.');
      return;
    }

    setAuditLoading(true);
    setAuditError(null);

    try {
      let url = '';
      let method = 'PUT';
      let body: any = { reason: auditReason.trim() };

      if (auditAction === 'cancel') {
        url = `http://localhost:5001/api/appointments/${auditTargetId}`;
        body.status = 'cancelled';
        body.cancelledBy = 'administrative';
        body.cancellationReason = auditReason.trim();
      } else if (auditAction === 'delete') {
        url = `http://localhost:5001/api/appointments/${auditTargetId}`;
        method = 'DELETE';
      } else if (auditAction === 'reset-pass') {
        url = 'http://localhost:5001/api/admin/change-password';
        body.userId = auditTargetId;
        body.newPassword = auditPassword;
      } else if (auditAction === 'update-hr') {
        url = `http://localhost:5001/api/admin/employees/${auditTargetId}`;
        // Gather new HR stats
        let docs = selectedEmp.associatedDocuments || [];
        if (newDocName && newDocUrl) {
          docs = [...docs, { documentName: newDocName, fileUrl: newDocUrl, uploadedAt: new Date().toISOString().split('T')[0] }];
        }
        body = {
          ...body,
          performanceRating: hrRating,
          hrNotes: hrNotes,
          resumeExperience: hrResume,
          associatedDocuments: docs
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operación de auditoría fallida.');

      setShowAuditModal(false);
      setShowHrEdit(false);
      setNewDocName('');
      setNewDocUrl('');
      setSelectedEmp(null);
      fetchDashboardData();
    } catch (err: any) {
      setAuditError(err.message);
    } finally {
      setAuditLoading(false);
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

  const doctorsList = employees.filter(e => e.clinicRole === 'doctor');

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      {/* HEADER SECTION */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {activeTab === 'admin-agenda' ? 'Agenda Global de Clínica' : 
             activeTab === 'admin-sessions' ? 'Consola de Sesiones Activas' :
             activeTab === 'admin-backups' ? 'Database SQL Backups & Respaldos' :
             activeTab === 'admin-patients' ? 'Fichas de Pacientes' :
             'Fichas de Personal & Recursos Humanos'}
          </h1>
          <p className="page-subtitle">
            Hola, {user.displayName}. Rol: {user.clinicRole === 'hr' ? 'Gestión de RRHH' : 'Administrador del Sistema'}.
          </p>
        </div>

        {/* Action Button depending on tab */}
        {activeTab === 'admin-agenda' && (
          <button className="btn btn-primary" onClick={() => setShowAppModal(true)}>
            <Plus size={16} /> Programar Nueva Cita
          </button>
        )}
        {activeTab === 'admin-patients' && (
          <button className="btn btn-primary" onClick={() => setShowPatientModal(true)}>
            <Plus size={16} /> Registrar Paciente
          </button>
        )}
        {(activeTab === 'admin-employees' || activeTab === 'hr-employees') && (
          <button className="btn btn-primary" onClick={() => setShowEmpModal(true)}>
            <Plus size={16} /> Contratar Personal (RRHH)
          </button>
        )}
        {activeTab === 'admin-backups' && (
          <button className="btn btn-primary" onClick={handleGenerateBackup} disabled={loading}>
            <Database size={16} /> {loading ? 'Generando Copia...' : 'Generar Copia de Seguridad'}
          </button>
        )}
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="alert alert-danger text-center justify-center mb-6">{error}</div>
      )}

      {/* Loading state indicator */}
      {loading && appointments.length === 0 && backups.length === 0 && sessions.length === 0 && (
        <div className="text-center p-10 text-secondary">Cargando registros...</div>
      )}

      {/* --- TAB 1: Global Appointments Agenda --- */}
      {activeTab === 'admin-agenda' && !loading && (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Médico</th>
                <th>Especialidad</th>
                <th>Paciente</th>
                <th>Horario de Cita</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((app) => (
                <tr key={app.id}>
                  <td className="font-semibold">{app.doctorName}</td>
                  <td className="text-xs">{app.doctorSpecialty}</td>
                  <td className="font-semibold">{app.patientName}</td>
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
                          onClick={() => openAuditModal('cancel', app.id)}
                        >
                          Cancelar
                        </button>
                        <button 
                          className="btn btn-danger text-xs px-3 py-1.5" 
                          onClick={() => openAuditModal('delete', app.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : app.status === 'cancelled' && app.cancellationReason ? (
                      <span className="text-xs text-muted">
                        Razón: {app.cancellationReason} (por {app.cancelledBy})
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB 2: Patients roster --- */}
      {activeTab === 'admin-patients' && !loading && (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Identificación</th>
                <th>Nombre y Apellido</th>
                <th>Correo Electrónico</th>
                <th>Teléfono de Contacto</th>
                <th>Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((pat) => (
                <tr key={pat.id}>
                  <td className="font-semibold text-primary">{pat.identityNumber}</td>
                  <td className="font-semibold">{pat.displayName}</td>
                  <td>{pat.email}</td>
                  <td>{pat.phone}</td>
                  <td className="text-xs text-muted">{new Date(pat.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB 3: HR Employee Administration Roster --- */}
      {(activeTab === 'admin-employees' || activeTab === 'hr-employees') && !loading && (
        <div className="grid gap-[30px]" style={{ gridTemplateColumns: selectedEmp ? '1fr 1fr' : '1fr' }}>
          <div>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Nómina</th>
                    <th>Nombre Completo</th>
                    <th>Rol Clínico</th>
                    <th>Departamento</th>
                    <th>Salario Mensual</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className={selectedEmp?.id === emp.id ? 'bg-[rgba(139,92,246,0.08)]' : ''}>
                      <td className="font-semibold text-primary">{emp.payrollNumber}</td>
                      <td className="font-semibold">{emp.displayName}</td>
                      <td className="uppercase text-xs font-semibold">{emp.clinicRole}</td>
                      <td>{emp.department}</td>
                      <td className="font-semibold">${parseFloat(emp.salary).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <button 
                          className="btn btn-secondary text-xs px-3 py-1.5" 
                          onClick={() => {
                            setSelectedEmp(emp);
                            setHrRating(emp.performanceRating || 'Good');
                            setHrNotes(emp.hrNotes || '');
                            setHrResume(emp.resumeExperience || '');
                            setShowHrEdit(false);
                          }}
                        >
                          Ficha HR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expanded Employee HR and Payroll File */}
          {selectedEmp && (
            <div className="flex flex-col gap-[30px]">
              <div className="stat-card stat-card-success bg-[rgba(17,24,39,0.85)]">
                <h3 className="text-lg font-bold border-b border-border-color pb-3 mb-4">
                  Ficha Laboral y de RRHH: {selectedEmp.displayName}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <span className="text-xs text-secondary">NÓMINA ASIGNADA</span>
                    <div className="font-bold flex items-center gap-1 text-[1.25rem] text-success">
                      <DollarSign size={18} /> {parseFloat(selectedEmp.salary).toLocaleString()} / mes
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-secondary">FECHA DE CONTRATACIÓN</span>
                    <div className="font-semibold text-[1.05rem] text-primary">
                      {new Date(selectedEmp.hireDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-secondary">HORARIO LABORAL</span>
                    <div className="text-sm text-primary">
                      {selectedEmp.workSchedule || 'No especificado'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-secondary">EVALUACIÓN RENDIMIENTO</span>
                    <div>
                      <span className="badge bg-[rgba(16,185,129,0.15)] text-[#34D399] border-none">
                        {selectedEmp.performanceRating || 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="font-semibold text-xs text-secondary mb-1">RESUMEN DE EXPERIENCIA (CV)</div>
                  <div className="text-sm p-3 bg-[rgba(255,255,255,0.02)] border border-border-color rounded-lg text-primary">
                    {selectedEmp.resumeExperience || 'Ningún resumen registrado.'}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="font-semibold text-xs text-secondary mb-1">NOTAS DE RRHH / RENDIMIENTO</div>
                  <div className="text-sm p-3 bg-[rgba(255,255,255,0.02)] border border-border-color rounded-lg text-primary">
                    {selectedEmp.hrNotes || 'Sin anotaciones de rendimiento.'}
                  </div>
                </div>

                {/* Associated dynamic PDF / Contract Documents list */}
                <div className="mb-5">
                  <div className="font-semibold text-xs text-secondary mb-2">DOCUMENTOS Y CONTRATOS</div>
                  {(!selectedEmp.associatedDocuments || selectedEmp.associatedDocuments.length === 0) ? (
                    <div className="text-xs text-muted">No hay documentos digitales cargados.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedEmp.associatedDocuments.map((doc: any, i: number) => (
                        <div key={i} className="doc-item-row">
                          <span className="text-xs font-semibold text-primary">📄 {doc.documentName}</span>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs px-2 py-1">
                            <Download size={12} /> Ver Doc
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 mt-5 border-t border-border-color pt-4">
                  <button className="btn btn-primary flex-grow" onClick={() => setShowHrEdit(true)}>
                    Actualizar Ficha HR
                  </button>
                  <button className="btn btn-secondary" onClick={() => openAuditModal('reset-pass', selectedEmp.id)}>
                    <Key size={14} /> Forzar Nueva Clave
                  </button>
                </div>
              </div>

              {/* Dynamic inline HR editor */}
              {showHrEdit && (
                <div className="stat-card stat-card-primary">
                  <h3 className="text-[1.05rem] font-bold mb-4">Actualizar Evaluaciones y Cargar Documentos</h3>
                  <form onSubmit={(e) => { e.preventDefault(); openAuditModal('update-hr', selectedEmp.id); }}>
                    <div className="form-group">
                      <label className="form-label">Rendimiento</label>
                      <select className="form-select" value={hrRating} onChange={(e) => setHrRating(e.target.value)}>
                        <option value="Excellent">Excelente (Excellent)</option>
                        <option value="Good">Bueno (Good)</option>
                        <option value="Average">Promedio (Average)</option>
                        <option value="Unsatisfactory">No Satisfactorio (Unsatisfactory)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Resumen de Experiencia</label>
                      <textarea className="form-textarea" rows={3} value={hrResume} onChange={(e) => setHrResume(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Notas Internas</label>
                      <textarea className="form-textarea" rows={3} value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} />
                    </div>

                    {/* Add document url */}
                    <div className="border border-dotted border-border-color p-3 rounded-lg mb-4">
                      <span className="text-xs font-bold text-secondary block mb-2">CARGAR DOCUMENTO PDF / CONTRATO</span>
                      <div className="form-group">
                        <input type="text" className="form-input" placeholder="Nombre (ej. Contrato 2026.pdf)" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <input type="text" className="form-input" placeholder="Enlace URL (ej. /uploads/docs/contrato.pdf)" value={newDocUrl} onChange={(e) => setNewDocUrl(e.target.value)} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full">
                      Actualizar Ficha de Personal
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: Active connected sessions monitor --- */}
      {activeTab === 'admin-sessions' && !loading && (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol de Sistema</th>
                <th>Dirección IP</th>
                <th>Navegador / OS</th>
                <th>Conectado Desde</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess) => (
                <tr key={sess.id}>
                  <td className="font-semibold">{sess.email}</td>
                  <td>{sess.displayName}</td>
                  <td className="uppercase text-xs font-semibold text-primary">
                    {sess.userType === 'admin' ? 'admin' : sess.clinicRole || 'paciente'}
                  </td>
                  <td className="font-mono text-xs">{sess.ipAddress}</td>
                  <td className="text-xs text-secondary max-w-[240px] truncate" title={sess.userAgent}>
                    {sess.userAgent}
                  </td>
                  <td className="text-xs text-secondary">{formatDate(sess.loginAt)}</td>
                  <td>
                    {/* Admins cannot revoke their own current session via this table for self-safety */}
                    {sess.tokenJti !== user.tokenJti ? (
                      <button 
                        className="btn btn-danger text-xs px-3 py-1.5" 
                        onClick={() => handleRevoke(sess.id)}
                      >
                        Desconectar
                      </button>
                    ) : (
                      <span className="text-xs text-muted font-semibold">Sesión Actual</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB 5: Backups history --- */}
      {activeTab === 'admin-backups' && !loading && (
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nombre de Respaldo SQL</th>
                <th>Fecha de Creación</th>
                <th>Tamaño de Archivo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((back, i) => (
                <tr key={i}>
                  <td className="font-semibold text-primary">📄 {back.filename}</td>
                  <td>{new Date(back.createdAt).toLocaleString()}</td>
                  <td className="font-mono">{(back.size / 1024).toFixed(2)} KB</td>
                  <td>
                    <a 
                      href={`http://localhost:5001/api/admin/backups/${back.filename}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-success text-xs px-3 py-1.5"
                    >
                      <Download size={12} /> Descargar SQL
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- BOOK APPOINTMENT MODAL --- */}
      {showAppModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Programar Nueva Cita Médica</h2>
            </div>
            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label className="form-label">Médico Asignado</label>
                <select className="form-select" value={appDoctor} onChange={(e) => setAppDoctor(e.target.value)}>
                  <option value="">Seleccione Médico...</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id}>{d.displayName} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Paciente</label>
                <select className="form-select" value={appPatient} onChange={(e) => setAppPatient(e.target.value)}>
                  <option value="">Seleccione Paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName} (DNI: {p.identityNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Inicio</label>
                  <input type="datetime-local" className="form-input" value={appStart} onChange={(e) => setAppStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fin</label>
                  <input type="datetime-local" className="form-input" value={appEnd} onChange={(e) => setAppEnd(e.target.value)} />
                </div>
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Motivo</label>
                <input type="text" className="form-input" placeholder="Ej: Chequeo cardiológico anual" value={appReason} onChange={(e) => setAppReason(e.target.value)} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAppModal(false)}>Cerrar</button>
                <button type="submit" className="btn btn-primary">Registrar Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REGISTER PATIENT MODAL --- */}
      {showPatientModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Registrar Ficha de Paciente</h2>
            </div>
            <form onSubmit={handlePatientSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input type="text" className="form-input" placeholder="Ej: Pedro" value={patFirst} onChange={(e) => setPatFirst(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input type="text" className="form-input" placeholder="Ej: Infante" value={patLast} onChange={(e) => setPatLast(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">DNI / Identificación</label>
                <input type="text" className="form-input" placeholder="Ej: 12345678A" value={patIdNum} onChange={(e) => setPatIdNum(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input type="email" className="form-input" placeholder="pedro@gmail.com" value={patEmail} onChange={(e) => setPatEmail(e.target.value)} />
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" placeholder="Ej: +34 600 000 000" value={patPhone} onChange={(e) => setPatPhone(e.target.value)} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPatientModal(false)}>Cerrar</button>
                <button type="submit" className="btn btn-primary">Registrar y Crear Cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REGISTER EMPLOYEE MODAL (HR) --- */}
      {showEmpModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-[650px]">
            <div className="modal-header">
              <h2 className="modal-title">Contratación de Personal & Registro RRHH</h2>
            </div>
            <form onSubmit={handleEmployeeSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input type="text" className="form-input" value={empFirst} onChange={(e) => setEmpFirst(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input type="text" className="form-input" value={empLast} onChange={(e) => setEmpLast(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Correo Institucional</label>
                  <input type="email" className="form-input" placeholder="nombre@clinicalflow.com" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="text" className="form-input" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <select className="form-select" value={empDept} onChange={(e) => setEmpDept(e.target.value)}>
                    <option value="Medical">Médico (Medical)</option>
                    <option value="Nursing">Enfermería (Nursing)</option>
                    <option value="Administration">Administración (Administration)</option>
                    <option value="HR">Recursos Humanos (HR)</option>
                    <option value="Maintenance">Mantenimiento (Maintenance)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rol Clínico</label>
                  <select className="form-select" value={empRole} onChange={(e) => setEmpRole(e.target.value)}>
                    <option value="doctor">Médico (doctor)</option>
                    <option value="nurse">Enfermera (nurse)</option>
                    <option value="administrative">Administrativo (administrative)</option>
                    <option value="maintenance">Mantenimiento (maintenance)</option>
                    <option value="hr">HR Specialist (hr)</option>
                    <option value="executive">Director Ejecutivo (executive)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Especialidad (Sólo Doctores)</label>
                  <input type="text" className="form-input" placeholder="Ej: Cardiología" value={empSpec} onChange={(e) => setEmpSpec(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Nómina (Nómina Única)</label>
                  <input type="text" className="form-input" placeholder="Ej: EMP-099" value={empPayroll} onChange={(e) => setEmpPayroll(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Salario Mensual ($)</label>
                  <input type="number" className="form-input" placeholder="4500" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Horario Laboral</label>
                  <input type="text" className="form-input" placeholder="Ej: Lunes a Viernes 08:00-16:00" value={empSched} onChange={(e) => setEmpSched(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="form-group">
                  <label className="form-label">Fecha Contratación</label>
                  <input type="date" className="form-input" value={empHire} onChange={(e) => setEmpHire(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña Cuenta</label>
                  <input type="text" className="form-input" value={empPass} onChange={(e) => setEmpPass(e.target.value)} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>Cerrar</button>
                <button type="submit" className="btn btn-primary">Dar de Alta & Contratar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UNIFIED COMPULSORY AUDIT MODAL --- */}
      {showAuditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {auditAction === 'cancel' ? 'Confirmar Cancelación de Cita' : 
                 auditAction === 'delete' ? 'Eliminar Registro del Sistema' :
                 auditAction === 'reset-pass' ? 'Forzar Nueva Contraseña' :
                 'Actualizar Ficha de RRHH (Nómina/Historial)'}
              </h2>
              <div className="text-xs text-secondary mt-1">
                Es obligatorio justificar esta operación. Se registrará de forma inmutable en el log de cambios.
              </div>
            </div>

            {auditError && (
              <div className="alert alert-danger mb-4 justify-center">
                {auditError}
              </div>
            )}

            <form onSubmit={handleAuditSubmit}>
              {/* Special Password reset field */}
              {auditAction === 'reset-pass' && (
                <div className="form-group mb-4">
                  <label className="form-label">Nueva Contraseña para el Usuario</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Escriba nueva clave..." 
                    value={auditPassword}
                    onChange={(e) => setAuditPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Razón / Motivo de la Acción</label>
                <textarea 
                  className="form-textarea" 
                  rows={4}
                  placeholder="Por favor, explique detalladamente por qué realiza esta acción (mínimo 10 caracteres)..."
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  disabled={auditLoading}
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Auditoría de seguridad y conformidad</span>
                  <span>{auditReason.length} / 10 caracteres</span>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAuditModal(false)}
                  disabled={auditLoading}
                >
                  Cerrar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  disabled={auditLoading || auditReason.trim().length < 10 || (auditAction === 'reset-pass' && !auditPassword)}
                >
                  {auditLoading ? 'Guardando Auditoría...' : 'Proceder y Firmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
