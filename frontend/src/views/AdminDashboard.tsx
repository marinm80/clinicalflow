import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
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
  UserCheck,
  Activity,
  AlertTriangle,
  Clock,
  Shield,
  FileSpreadsheet,
  Check
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
        const appRes = await fetch('http://localhost:5000/api/appointments', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const appData = await appRes.json();
        setAppointments(appRes.ok ? appData : []);
      }

      // Load patients
      if (['admin-agenda', 'admin-patients', 'patients'].includes(activeTab)) {
        const patRes = await fetch('http://localhost:5000/api/patients', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const patData = await patRes.json();
        setPatients(patRes.ok ? patData : []);
      }

      // Load employees (HR roster)
      if (['admin-agenda', 'admin-employees', 'hr-employees'].includes(activeTab)) {
        const empRes = await fetch('http://localhost:5000/api/admin/employees', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const empData = await empRes.json();
        setEmployees(empRes.ok ? empData : []);
      }

      // Load sessions
      if (activeTab === 'admin-sessions') {
        const sessRes = await fetch('http://localhost:5000/api/admin/sessions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const sessData = await sessRes.json();
        setSessions(sessRes.ok ? sessData : []);
      }

      // Load backups
      if (activeTab === 'admin-backups') {
        const backRes = await fetch('http://localhost:5000/api/admin/backups', {
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
      const response = await fetch('http://localhost:5000/api/appointments', {
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
      setAppDoctor('');
      setAppPatient('');
      setAppStart('');
      setAppEnd('');
      setAppReason('');
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
      const response = await fetch('http://localhost:5000/api/patients', {
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
      const response = await fetch('http://localhost:5000/api/admin/employees', {
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
      const response = await fetch(`http://localhost:5000/api/admin/sessions/${sessionId}/revoke`, {
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
      const response = await fetch('http://localhost:5000/api/admin/backups', {
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
        url = `http://localhost:5000/api/appointments/${auditTargetId}`;
        body.status = 'cancelled';
        body.cancelledBy = 'administrative';
        body.cancellationReason = auditReason.trim();
      } else if (auditAction === 'delete') {
        url = `http://localhost:5000/api/appointments/${auditTargetId}`;
        method = 'DELETE';
      } else if (auditAction === 'reset-pass') {
        url = 'http://localhost:5000/api/admin/change-password';
        body.userId = auditTargetId;
        body.newPassword = auditPassword;
      } else if (auditAction === 'update-hr') {
        url = `http://localhost:5000/api/admin/employees/${auditTargetId}`;
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
  const activeAppointments = appointments.filter(a => a.status === 'scheduled');
  const totalConflictAlerts = appointments.filter(a => a.status === 'cancelled' && a.cancellationReason && a.cancellationReason.toLowerCase().includes('solap')).length;

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {activeTab === 'admin-agenda' ? 'Panel de Gestión de Agendas' : 
             activeTab === 'admin-sessions' ? 'Consola de Seguridad: Sesiones Activas' :
             activeTab === 'admin-backups' ? 'Respaldos de Base de Datos SQL' :
             activeTab === 'admin-patients' ? 'Fichero General de Pacientes' :
             'Fichas de Personal & Recursos Humanos'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Clínico: {user.displayName} ({user.clinicRole === 'hr' ? 'Recursos Humanos' : 'Administrador Global'})
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-3">
          {activeTab === 'admin-agenda' && (
            <button 
              className="btn btn-primary rounded-xl px-5 py-3 hover:shadow-md hover:bg-blue-700 transition-all duration-200" 
              onClick={() => setShowAppModal(true)}
            >
              <Plus size={18} /> Nueva Cita Médica
            </button>
          )}
          {activeTab === 'admin-patients' && (
            <button 
              className="btn btn-primary rounded-xl px-5 py-3 hover:shadow-md hover:bg-blue-700 transition-all duration-200" 
              onClick={() => setShowPatientModal(true)}
            >
              <Plus size={18} /> Registrar Nuevo Paciente
            </button>
          )}
          {(activeTab === 'admin-employees' || activeTab === 'hr-employees') && (
            <button 
              className="btn btn-primary rounded-xl px-5 py-3 hover:shadow-md hover:bg-blue-700 transition-all duration-200" 
              onClick={() => setShowEmpModal(true)}
            >
              <Plus size={18} /> Contratar Personal (RRHH)
            </button>
          )}
          {activeTab === 'admin-backups' && (
            <button 
              className="btn btn-primary rounded-xl px-5 py-3 hover:shadow-md hover:bg-blue-700 transition-all duration-200" 
              onClick={handleGenerateBackup} 
              disabled={loading}
            >
              <Database size={18} /> {loading ? 'Generando Copia...' : 'Respaldar Base de Datos'}
            </button>
          )}
        </div>
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="alert alert-danger shadow-sm border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && appointments.length === 0 && backups.length === 0 && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 gap-3">
          <Activity className="animate-spin text-blue-500" size={32} />
          <span className="text-sm font-medium">Sincronizando registros médicos...</span>
        </div>
      )}

      {/* --- TAB 1: Global Appointments Agenda --- */}
      {activeTab === 'admin-agenda' && !loading && (
        <div className="flex flex-col gap-8">
          
          {/* Fila de Estadísticas (Stats Cards Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 rounded-2xl flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <CalendarIcon size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Citas Activas</span>
                <span className="text-2xl font-bold text-slate-800">{activeAppointments.length}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 rounded-2xl flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Médicos Activos</span>
                <span className="text-2xl font-bold text-slate-800">{doctorsList.length}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 rounded-2xl flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Activity size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ocupación Clínicas</span>
                <span className="text-2xl font-bold text-slate-800">89.4%</span>
              </div>
            </div>

            <div className={`bg-white border shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 rounded-2xl flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${totalConflictAlerts > 0 ? 'border-rose-100 bg-rose-50/20' : 'border-slate-100'}`}>
              <div className={`p-3 rounded-xl ${totalConflictAlerts > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Conflictos de Cita</span>
                <span className={`text-2xl font-bold ${totalConflictAlerts > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{totalConflictAlerts}</span>
              </div>
            </div>
          </div>

          {/* Agenda de Citas como Tarjetero / Timeline Moderno */}
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slate-900">Agenda Diaria de Consultorios</h2>
            
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-100 shadow-sm rounded-2xl text-slate-400 gap-3">
                <CalendarIcon size={44} className="text-slate-300" />
                <span className="text-sm font-medium">No hay ninguna consulta programada para la fecha actual</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {appointments.map((app) => (
                  <div 
                    key={app.id} 
                    className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-200 relative overflow-hidden ${app.status === 'cancelled' ? 'opacity-85' : ''}`}
                  >
                    {/* Dynamic Border Indicator by Status */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${app.status === 'scheduled' ? 'bg-blue-500' : app.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                    <div className="flex justify-between items-start pl-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
                          {app.patientName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{app.patientName}</span>
                          <span className="text-xs text-slate-400 font-medium">DNI: {app.patientPhone || 'N/A'}</span>
                        </div>
                      </div>

                      <span className={`badge ${app.status === 'scheduled' ? 'badge-scheduled' : app.status === 'completed' ? 'badge-completed' : 'badge-cancelled'} text-[0.72rem] font-bold px-2.5 py-1 rounded-full border border-none`}>
                        {app.status === 'scheduled' ? 'Programada' : app.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 bg-slate-50/50 rounded-xl p-4 border border-slate-100/50 text-xs gap-3">
                      <div>
                        <span className="text-slate-400 block font-medium uppercase tracking-wider mb-0.5">Especialista</span>
                        <span className="font-semibold text-slate-800">{app.doctorName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium uppercase tracking-wider mb-0.5">Especialidad</span>
                        <span className="font-semibold text-slate-800 text-[0.72rem] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100/30 inline-block mt-0.5">
                          {app.doctorSpecialty}
                        </span>
                      </div>
                      <div className="col-span-2 border-t border-slate-100 pt-2 flex items-center gap-2">
                        <Clock size={13} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">{formatDate(app.startTime)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pl-2">
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Motivo Clínico</span>
                      <span className="text-xs font-semibold text-slate-700">{app.reason}</span>
                    </div>

                    {app.status === 'cancelled' && app.cancellationReason && (
                      <div className="p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold block mb-0.5">Cancelación Justificada:</span>
                          <span>{app.cancellationReason} (por {app.cancelledBy})</span>
                        </div>
                      </div>
                    )}

                    {app.status === 'scheduled' && (
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-1">
                        <button 
                          className="btn btn-secondary text-xs px-4 py-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
                          onClick={() => openAuditModal('cancel', app.id)}
                        >
                          Cancelar Turno
                        </button>
                        <button 
                          className="btn btn-danger text-xs px-3 py-2 hover:bg-rose-700 rounded-lg transition-all duration-200 flex items-center justify-center"
                          onClick={() => openAuditModal('delete', app.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: Patients roster --- */}
      {activeTab === 'admin-patients' && !loading && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-lg font-bold text-slate-900">Historial Clínico General de Pacientes</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{patients.length} pacientes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="premium-table min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4">DNI / Identificación</th>
                  <th className="px-6 py-4">Nombre y Apellidos</th>
                  <th className="px-6 py-4">Correo Electrónico</th>
                  <th className="px-6 py-4">Contacto Telefónico</th>
                  <th className="px-6 py-4">Fecha de Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-xs text-blue-600 tracking-wider font-mono">{pat.identityNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{pat.displayName}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{pat.email}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{pat.phone}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium">{new Date(pat.createdAt).toLocaleDateString('es-ES')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: HR Employee Administration Roster --- */}
      {(activeTab === 'admin-employees' || activeTab === 'hr-employees') && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in-up">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Plantilla de Personal Clínico</h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{employees.length} contratados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="premium-table min-w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-4">Nómina</th>
                    <th className="px-6 py-4">Nombre Completo</th>
                    <th className="px-6 py-4">Rol Clínico</th>
                    <th className="px-6 py-4">Departamento</th>
                    <th className="px-6 py-4">Salario</th>
                    <th className="px-6 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr 
                      key={emp.id} 
                      className={`transition-colors hover:bg-slate-50/70 ${selectedEmp?.id === emp.id ? 'bg-blue-50/50 hover:bg-blue-50/50' : ''}`}
                    >
                      <td className="px-6 py-4 font-bold text-blue-600 tracking-wider text-xs font-mono">{emp.payrollNumber}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{emp.displayName}</td>
                      <td className="px-6 py-4 text-xs font-bold"><span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">{emp.clinicRole}</span></td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{emp.department}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 text-sm">${parseFloat(emp.salary).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <button 
                          className="btn btn-secondary text-xs px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-all duration-200" 
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
          {selectedEmp ? (
            <div className="flex flex-col gap-6">
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col gap-5 relative overflow-hidden">
                {/* Visual Accent Banner */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-teal-400" />

                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
                      {selectedEmp.displayName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{selectedEmp.displayName}</h3>
                      <span className="text-xs font-bold text-blue-600 font-mono tracking-wider">Código Nómina: {selectedEmp.payrollNumber}</span>
                    </div>
                  </div>

                  <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100/50 text-[0.72rem] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Activity size={12} className="animate-pulse" /> Activo en Roster
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-5 bg-slate-50/50 border border-slate-100/50 rounded-2xl p-5">
                  <div className="hr-detail-item">
                    <span className="hr-detail-label">Salario Mensual</span>
                    <span className="text-emerald-600 font-bold text-xl flex items-center mt-0.5">
                      <DollarSign size={18} className="text-emerald-500 mt-0.5" /> 
                      {parseFloat(selectedEmp.salary).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="hr-detail-item">
                    <span className="hr-detail-label">Fecha Alta Laboral</span>
                    <span className="hr-detail-value mt-0.5">{new Date(selectedEmp.hireDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="hr-detail-item">
                    <span className="hr-detail-label">Horario Clínico</span>
                    <span className="hr-detail-value mt-0.5 text-xs text-slate-600 font-semibold">{selectedEmp.workSchedule || 'Sin definir'}</span>
                  </div>
                  <div className="hr-detail-item">
                    <span className="hr-detail-label">Evaluación de Desempeño</span>
                    <div className="mt-1">
                      <span className={`badge text-[0.72rem] font-bold px-2.5 py-0.5 rounded border border-none ${selectedEmp.performanceRating === 'Excellent' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {selectedEmp.performanceRating || 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="font-bold text-xs text-slate-400 uppercase tracking-wider">Historial Profesional / Currículum</div>
                  <div className="text-sm p-4 bg-slate-50/30 border border-slate-100 rounded-xl text-slate-600 leading-relaxed max-h-[120px] overflow-y-auto font-medium">
                    {selectedEmp.resumeExperience || 'No se registra currículum detallado.'}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="font-bold text-xs text-slate-400 uppercase tracking-wider">Notas Internas de Desempeño (RRHH)</div>
                  <div className="text-sm p-4 bg-slate-50/30 border border-slate-100 rounded-xl text-slate-600 leading-relaxed max-h-[120px] overflow-y-auto font-medium">
                    {selectedEmp.hrNotes || 'Sin notas internas de desempeño.'}
                  </div>
                </div>

                {/* Associated dynamic PDF / Contract Documents list */}
                <div className="flex flex-col gap-3">
                  <div className="font-bold text-xs text-slate-400 uppercase tracking-wider">Contratos & Documentación Digitalizada</div>
                  {(!selectedEmp.associatedDocuments || selectedEmp.associatedDocuments.length === 0) ? (
                    <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center font-medium bg-slate-50/20">
                      No hay ningún contrato PDF o documento digital adjunto a esta ficha laboral.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {selectedEmp.associatedDocuments.map((doc: any, i: number) => (
                        <div key={i} className="doc-item-row bg-slate-50/30">
                          <div className="flex items-center gap-2.5 pl-1">
                            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><FileSpreadsheet size={16} /></span>
                            <span className="text-xs font-semibold text-slate-800">{doc.documentName}</span>
                          </div>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-secondary text-xs px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            <Download size={13} /> Descargar
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4 border-t border-slate-100 pt-5">
                  <button className="btn btn-primary flex-grow rounded-xl py-3" onClick={() => setShowHrEdit(true)}>
                    Actualizar Ficha HR
                  </button>
                  <button className="btn btn-secondary rounded-xl py-3 px-4" onClick={() => openAuditModal('reset-pass', selectedEmp.id)}>
                    <Key size={14} /> Reestablecer Clave
                  </button>
                </div>
              </div>

              {/* Dynamic inline HR editor */}
              {showHrEdit && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 animate-fade-in">
                  <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3 mb-1">Evaluación & Actualización de Historial</h3>
                  <form onSubmit={(e) => { e.preventDefault(); openAuditModal('update-hr', selectedEmp.id); }} className="flex flex-col gap-4">
                    <div className="form-group">
                      <label className="form-label">Rendimiento Anual</label>
                      <select className="form-select" value={hrRating} onChange={(e) => setHrRating(e.target.value)}>
                        <option value="Excellent">Excelente (Excellent)</option>
                        <option value="Good">Bueno (Good)</option>
                        <option value="Average">Promedio (Average)</option>
                        <option value="Unsatisfactory">Insatisfactorio (Unsatisfactory)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Actualizar Currículum / Experiencia</label>
                      <textarea className="form-textarea" rows={3} value={hrResume} onChange={(e) => setHrResume(e.target.value)} placeholder="Agregue información laboral..." />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Notas de RRHH</label>
                      <textarea className="form-textarea" rows={3} value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Ingrese anotaciones internas..." />
                    </div>

                    {/* Add document url */}
                    <div className="border border-dashed border-slate-200 bg-slate-50/50 p-4 rounded-2xl flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Adjuntar Documento Digital (PDF)</span>
                      <div className="form-group">
                        <input type="text" className="form-input" placeholder="Ej: Contrato Indefinido 2026.pdf" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                      </div>
                      <div className="form-group mb-0">
                        <input type="text" className="form-input" placeholder="URL: /uploads/docs/contrato.pdf" value={newDocUrl} onChange={(e) => setNewDocUrl(e.target.value)} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all duration-200">
                      Firmar y Guardar Ficha
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-100 shadow-sm rounded-2xl text-slate-400 gap-3">
              <FolderPlus size={44} className="text-slate-300" />
              <span className="text-sm font-medium">Selecciona un empleado de la plantilla para visualizar su Ficha HR extendida</span>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: Active connected sessions monitor --- */}
      {activeTab === 'admin-sessions' && !loading && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Auditoría en Tiempo Real de Sesiones Activas</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{sessions.length} conectadas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="premium-table min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Nombre Completo</th>
                  <th className="px-6 py-4">Nivel Sistema</th>
                  <th className="px-6 py-4">Dirección IP</th>
                  <th className="px-6 py-4">User-Agent Navegador</th>
                  <th className="px-6 py-4">Fecha Conexión</th>
                  <th className="px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{sess.email}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{sess.displayName}</td>
                    <td className="px-6 py-4 text-xs font-bold text-blue-600"><span className="px-2.5 py-0.5 bg-blue-50 rounded uppercase tracking-wider">{sess.userType === 'admin' ? 'Administrador' : sess.clinicRole || 'Paciente'}</span></td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{sess.ipAddress}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 max-w-[240px] truncate" title={sess.userAgent}>{sess.userAgent}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatDate(sess.loginAt)}</td>
                    <td className="px-6 py-4">
                      {sess.tokenJti !== user.tokenJti ? (
                        <button 
                          className="btn btn-danger text-xs px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-all" 
                          onClick={() => handleRevoke(sess.id)}
                        >
                          Revocar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold bg-blue-50/50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100/20">Sesión Actual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: Backups history --- */}
      {activeTab === 'admin-backups' && !loading && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Historial del Servidor: Copias de Seguridad SQL</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{backups.length} respaldos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="premium-table min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4">Nombre de Archivo de Respaldo</th>
                  <th className="px-6 py-4">Fecha y Hora de Creación</th>
                  <th className="px-6 py-4">Tamaño en Disco</th>
                  <th className="px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((back, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-600 tracking-wider text-xs font-mono">📄 {back.filename}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{new Date(back.createdAt).toLocaleString('es-ES')}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{(back.size / 1024).toFixed(2)} KB</td>
                    <td className="px-6 py-4">
                      <a 
                        href={`http://localhost:5000/api/admin/backups/${back.filename}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-success text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all font-semibold flex items-center gap-1.5 w-fit"
                      >
                        <Download size={13} /> Descargar SQL
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- BOOK APPOINTMENT MODAL --- */}
      {showAppModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Programar Cita Médica Diaria</h2>
            </div>
            <form onSubmit={handleBookSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Médico Especialista Asignado</label>
                <select className="form-select" value={appDoctor} onChange={(e) => setAppDoctor(e.target.value)}>
                  <option value="">Seleccione Médico...</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id}>{d.displayName} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Paciente Solicitante</label>
                <select className="form-select" value={appPatient} onChange={(e) => setAppPatient(e.target.value)}>
                  <option value="">Seleccione Paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName} (DNI: {p.identityNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Fecha y Hora Inicio</label>
                  <input type="datetime-local" className="form-input" value={appStart} onChange={(e) => setAppStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha y Hora Fin</label>
                  <input type="datetime-local" className="form-input" value={appEnd} onChange={(e) => setAppEnd(e.target.value)} />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Motivo de Consulta General</label>
                <input type="text" className="form-input" placeholder="Ej: Chequeo cardiológico anual" value={appReason} onChange={(e) => setAppReason(e.target.value)} />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-100 flex gap-2">
                <button type="button" className="btn btn-secondary rounded-xl py-3 px-5" onClick={() => setShowAppModal(false)}>Cerrar</button>
                <button type="submit" className="btn btn-primary rounded-xl py-3 px-5 font-bold hover:bg-blue-700">Programar Cita</button>
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
              <h2 className="modal-title">Registrar Nuevo Expediente de Paciente</h2>
            </div>
            <form onSubmit={handlePatientSubmit} className="flex flex-col gap-4">
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
                <label className="form-label">DNI / Número de Identificación</label>
                <input type="text" className="form-input" placeholder="Ej: 12345678A" value={patIdNum} onChange={(e) => setPatIdNum(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input type="email" className="form-input" placeholder="pedro@gmail.com" value={patEmail} onChange={(e) => setPatEmail(e.target.value)} />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Contacto Telefónico</label>
                <input type="text" className="form-input" placeholder="Ej: +34 600 000 000" value={patPhone} onChange={(e) => setPatPhone(e.target.value)} />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-100 flex gap-2">
                <button type="button" className="btn btn-secondary rounded-xl py-3 px-5" onClick={() => setShowPatientModal(false)}>Cerrar</button>
                <button type="submit" className="btn btn-primary rounded-xl py-3 px-5 font-bold hover:bg-blue-700">Crear Paciente</button>
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
              <h2 className="modal-title">Ficha de Alta y Contratación Laboral</h2>
            </div>
            <form onSubmit={handleEmployeeSubmit} className="flex flex-col gap-4">
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
                  <label className="form-label">Contacto Telefónico</label>
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
                  <label className="form-label">Número de Nómina Único</label>
                  <input type="text" className="form-input" placeholder="Ej: EMP-099" value={empPayroll} onChange={(e) => setEmpPayroll(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Salario Mensual ($)</label>
                  <input type="number" className="form-input" placeholder="4500" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Horario Laboral Asignado</label>
                  <input type="text" className="form-input" placeholder="Ej: Lunes a Viernes 08:00-16:00" value={empSched} onChange={(e) => setEmpSched(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="form-label">Fecha Alta Contrato</label>
                  <input type="date" className="form-input" value={empHire} onChange={(e) => setEmpHire(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña de Acceso</label>
                  <input type="text" className="form-input" value={empPass} onChange={(e) => setEmpPass(e.target.value)} />
                </div>
              </div>

              <div className="modal-footer pt-3 border-t border-slate-100 flex gap-2">
                <button type="button" className="btn btn-secondary rounded-xl py-3 px-5" onClick={() => setShowEmpModal(false)}>Cerrar</button>
                <button type="submit" className="btn btn-primary rounded-xl py-3 px-5 font-bold hover:bg-blue-700">Contratar y Activar</button>
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
                 auditAction === 'delete' ? 'Eliminar Registro de Base de Datos' :
                 auditAction === 'reset-pass' ? 'Forzar Nueva Contraseña de Acceso' :
                 'Actualizar Ficha de RRHH (Nómina/Historial)'}
              </h2>
              <div className="text-xs text-secondary mt-1">
                Es obligatorio justificar esta operación para cumplir con las normas de seguridad y auditoría clínica.
              </div>
            </div>

            {auditError && (
              <div className="alert alert-danger mb-4 justify-center">
                {auditError}
              </div>
            )}

            <form onSubmit={handleAuditSubmit} className="flex flex-col gap-4">
              {/* Special Password reset field */}
              {auditAction === 'reset-pass' && (
                <div className="form-group mb-1">
                  <label className="form-label">Nueva Contraseña del Usuario</label>
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
                <label className="form-label">Justificación Clínica / Administrativa</label>
                <textarea 
                  className="form-textarea" 
                  rows={4}
                  placeholder="Explique el motivo detallado de esta acción (mínimo 10 caracteres)..."
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  disabled={auditLoading}
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Log de auditoría de seguridad y conformidad</span>
                  <span>{auditReason.length} / 10 caracteres</span>
                </div>
              </div>

              <div className="modal-footer pt-3 border-t border-slate-100 flex gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary rounded-xl py-3 px-5" 
                  onClick={() => setShowAuditModal(false)}
                  disabled={auditLoading}
                >
                  Cerrar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger rounded-xl py-3 px-5 font-bold hover:bg-rose-700"
                  disabled={auditLoading || auditReason.trim().length < 10 || (auditAction === 'reset-pass' && !auditPassword)}
                >
                  {auditLoading ? 'Firmando Auditoría...' : 'Firmar y Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
