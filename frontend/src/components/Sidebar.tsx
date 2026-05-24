import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Database, 
  LogOut, 
  ShieldAlert, 
  FileText,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    userType: 'patient' | 'employee' | 'admin';
    patientId: string | null;
    employeeId: string | null;
    displayName: string;
    clinicRole?: 'doctor' | 'nurse' | 'administrative' | 'maintenance' | 'hr' | 'executive';
    department?: string;
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const navigate = useNavigate();

  const getRoleLabel = () => {
    if (user.userType === 'admin') return 'Administrador Global';
    if (user.userType === 'patient') return 'Paciente';
    if (user.userType === 'employee') {
      const roleMap: Record<string, string> = {
        doctor: 'Médico Especialista',
        nurse: 'Personal de Enfermería',
        administrative: 'Administrativo / Recepción',
        maintenance: 'Mantenimiento de Clínica',
        hr: 'Especialista en RRHH',
        executive: 'Director Ejecutivo'
      };
      return roleMap[user.clinicRole || ''] || 'Empleado';
    }
    return 'Usuario';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        🩺 ClinicalFlow
      </div>

      <div className="sidebar-menu">
        {/* Patient Dashboard Tab */}
        {user.userType === 'patient' && (
          <div 
            className={`sidebar-item ${activeTab === 'patient-agenda' ? 'active' : ''}`}
            onClick={() => setActiveTab('patient-agenda')}
          >
            <Calendar size={18} />
            Mis Citas Médicas
          </div>
        )}

        {/* Doctor Dashboard Tabs */}
        {user.userType === 'employee' && user.clinicRole === 'doctor' && (
          <>
            <div 
              className={`sidebar-item ${activeTab === 'doctor-agenda' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctor-agenda')}
            >
              <Calendar size={18} />
              Mi Agenda de Citas
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'doctor-expedientes' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctor-expedientes')}
            >
              <FileText size={18} />
              Buscador Clínico
            </div>
          </>
        )}

        {/* Reception / Nurse / Administrative Tabs */}
        {user.userType === 'employee' && ['administrative', 'nurse'].includes(user.clinicRole || '') && (
          <>
            <div 
              className={`sidebar-item ${activeTab === 'admin-agenda' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-agenda')}
            >
              <Calendar size={18} />
              Agenda de Clínica
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'admin-patients' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-patients')}
            >
              <Users size={18} />
              Fichas de Pacientes
            </div>
          </>
        )}

        {/* HR Specialist Tabs */}
        {user.userType === 'employee' && user.clinicRole === 'hr' && (
          <div 
            className={`sidebar-item ${activeTab === 'hr-employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('hr-employees')}
          >
            <UserCheck size={18} />
            Nómina y Personal RRHH
          </div>
        )}

        {/* Súper Administrador Tabs */}
        {user.userType === 'admin' && (
          <>
            <div 
              className={`sidebar-item ${activeTab === 'admin-agenda' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-agenda')}
            >
              <Calendar size={18} />
              Agenda Global
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'admin-employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-employees')}
            >
              <UserCheck size={18} />
              Fichas de Personal & HR
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'admin-sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-sessions')}
            >
              <ShieldAlert size={18} />
              Sesiones Activas
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'admin-backups' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-backups')}
            >
              <Database size={18} />
              Respaldos SQL (Backups)
            </div>
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user.displayName}</div>
          <div className="sidebar-user-role">{getRoleLabel()}</div>
        </div>
        <button className="btn btn-secondary w-full" onClick={onLogout}>
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
