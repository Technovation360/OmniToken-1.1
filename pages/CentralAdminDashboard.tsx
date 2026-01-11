
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, Clinic, AdVideo, Token, Advertiser, User, Role, Specialty } from '../types';

interface Props {
  state: AppState;
  onAddClinic: (c: Clinic) => void;
  onDeleteClinic: (id: string) => void;
  onUpdateClinic: (c: Clinic) => void;
  onAddAdvertiser: (a: Advertiser) => void;
  onUpdateAdvertiser: (a: Advertiser) => void;
  onDeleteAdvertiser: (id: string) => void;
  onAddVideo: (v: AdVideo) => void;
  onUpdateToken: (t: Token) => void;
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onAddSpecialty: (s: Specialty) => void;
  onDeleteSpecialty: (id: string) => void;
  onUpdateSpecialty: (id: string, updated: Specialty) => void;
  activeTab: 'insights' | 'clinics' | 'patient-details' | 'live-queue' | 'advertisers' | 'videos' | 'users' | 'specialties';
  onTabChange: (tab: 'insights' | 'clinics' | 'patient-details' | 'live-queue' | 'advertisers' | 'videos' | 'users' | 'specialties') => void;
}

type SortKey = 'name' | 'age' | 'gender' | 'phone' | 'email';

const CentralAdminDashboard: React.FC<Props> = ({ 
  state, 
  onAddClinic, 
  onDeleteClinic, 
  onUpdateClinic, 
  onAddAdvertiser, 
  onUpdateAdvertiser, 
  onDeleteAdvertiser, 
  onAddVideo, 
  onUpdateToken, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser, 
  onAddSpecialty,
  onDeleteSpecialty,
  onUpdateSpecialty,
  activeTab, 
  onTabChange 
}) => {
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [showAdvertiserModal, setShowAdvertiserModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<{name: string, phone: string} | null>(null);
  
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);

  // Global Registry Search
  const [registryGlobalSearch, setRegistryGlobalSearch] = useState('');
  const [registryClinicId, setRegistryClinicId] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  // Live Queue Search & Filter
  const [liveQueueSearch, setLiveQueueSearch] = useState('');
  const [liveQueueClinicId, setLiveQueueClinicId] = useState('');

  // History Modal Specific Filters
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTill, setHistoryTill] = useState('');
  const [historyDoctor, setHistoryDoctor] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [isHistoryFilterCollapsed, setIsHistoryFilterCollapsed] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, type: 'CLINIC' | 'ADVERTISER' | 'USER' | 'SPECIALTY', name: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);
  
  const [clinicName, setClinicName] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicState, setClinicState] = useState('');
  const [clinicPincode, setClinicPincode] = useState('');
  const [clinicSpecialties, setClinicSpecialties] = useState<string[]>([]);
  
  const [advCompany, setAdvCompany] = useState('');
  const [advContact, setAdvContact] = useState('');
  const [advEmail, setAdvEmail] = useState('');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userSpecialty, setUserSpecialty] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userRole, setUserRole] = useState<Role>('CLINIC_ADMIN');
  const [userClinicId, setUserClinicId] = useState('');
  const [userAdvertiserId, setUserAdvertiserId] = useState('');

  const [specName, setSpecName] = useState('');
  const [specForClinic, setSpecForClinic] = useState(true);
  const [specForDoctor, setSpecForDoctor] = useState(true);

  useEffect(() => {
    if (editingClinic) {
      setClinicName(editingClinic.name);
      setClinicPhone(editingClinic.phone);
      setClinicEmail(editingClinic.email);
      setClinicAddress(editingClinic.address);
      setClinicCity(editingClinic.city);
      setClinicState(editingClinic.state);
      setClinicPincode(editingClinic.pincode);
      setClinicSpecialties(editingClinic.specialties || []);
    } else {
      setClinicName(''); setClinicPhone(''); setClinicEmail(''); 
      setClinicAddress(''); setClinicCity(''); setClinicState('');
      setClinicPincode(''); setClinicSpecialties([]);
    }
  }, [editingClinic, showClinicModal]);

  useEffect(() => {
    if (editingUser) {
      setUserName(editingUser.name);
      setUserEmail(editingUser.email);
      setUserPhone(editingUser.phone || '');
      setUserSpecialty(editingUser.specialty || '');
      setUserRole(editingUser.role);
      setUserClinicId(editingUser.clinicId || '');
      setUserAdvertiserId(editingUser.advertiserId || '');
    } else {
      setUserName(''); setUserEmail(''); setUserPhone('');
      setUserSpecialty(''); setUserPassword(''); 
      setUserRole('CLINIC_ADMIN'); setUserClinicId(''); setUserAdvertiserId('');
    }
  }, [editingUser, showUserModal]);

  useEffect(() => {
    if (editingSpecialty) {
      setSpecName(editingSpecialty.name);
      setSpecForClinic(editingSpecialty.forClinic);
      setSpecForDoctor(editingSpecialty.forDoctor);
    } else {
      setSpecName('');
      setSpecForClinic(true);
      setSpecForDoctor(true);
    }
  }, [editingSpecialty, showSpecialtyModal]);

  const triggerNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveClinic = () => {
    if (!clinicName || !clinicEmail) return;
    const cData: Clinic = {
      id: editingClinic ? editingClinic.id : Math.random().toString(36).substr(2, 9),
      name: clinicName, phone: clinicPhone, email: clinicEmail,
      address: clinicAddress, city: clinicCity, state: clinicState, pincode: clinicPincode,
      specialties: clinicSpecialties, adminId: editingClinic ? editingClinic.adminId : 'u2'
    };
    editingClinic ? onUpdateClinic(cData) : onAddClinic(cData);
    setShowClinicModal(false);
    triggerNotification(editingClinic ? "Clinic updated." : "Clinic onboarded.");
  };

  const handleSaveUser = () => {
    if (!userName || !userEmail) return;
    const uData: User = {
      id: editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9),
      name: userName, email: userEmail,
      phone: userRole !== 'SCREEN' ? userPhone : undefined,
      specialty: userRole === 'DOCTOR' ? userSpecialty : undefined,
      password: editingUser ? editingUser.password : userPassword,
      role: userRole,
      clinicId: ['CLINIC_ADMIN', 'DOCTOR', 'ASSISTANT', 'SCREEN'].includes(userRole) ? userClinicId : undefined,
      advertiserId: userRole === 'ADVERTISER' ? userAdvertiserId : undefined
    };
    editingUser ? onUpdateUser(uData) : onAddUser(uData);
    setShowUserModal(false);
    triggerNotification(editingUser ? "User updated." : "User registered.");
  };

  const confirmDelete = () => {
    if (!showDeleteConfirm) return;
    const { id, type } = showDeleteConfirm;
    if (type === 'CLINIC') onDeleteClinic(id);
    else if (type === 'ADVERTISER') onDeleteAdvertiser(id);
    else if (type === 'USER') onDeleteUser(id);
    else if (type === 'SPECIALTY') onDeleteSpecialty(id);
    setShowDeleteConfirm(null);
    triggerNotification("Entry removed.", 'danger');
  };

  const handleResetPassword = () => {
    if (!resettingUser || !newPassword) return;
    onUpdateUser({ ...resettingUser, password: newPassword });
    setShowResetModal(false);
    setNewPassword('');
    triggerNotification("Password reset successful.");
  };

  const handleSaveSpecialty = () => {
    const trimmed = specName.trim();
    if (!trimmed) return;
    const sData: Specialty = {
      id: editingSpecialty ? editingSpecialty.id : Math.random().toString(36).substr(2, 9),
      name: trimmed,
      forClinic: specForClinic,
      forDoctor: specForDoctor
    };
    editingSpecialty ? onUpdateSpecialty(editingSpecialty.id, sData) : onAddSpecialty(sData);
    setEditingSpecialty(null);
    setShowSpecialtyModal(false);
    triggerNotification("Specialty record saved.");
  };

  const handleSaveAdvertiser = () => {
    if (!advCompany || !advEmail) return;
    const aData: Advertiser = {
      id: editingAdvertiser ? editingAdvertiser.id : Math.random().toString(36).substr(2, 9),
      companyName: advCompany, contactPerson: advContact, email: advEmail, status: 'active'
    };
    editingAdvertiser ? onUpdateAdvertiser(aData) : onAddAdvertiser(aData);
    setShowAdvertiserModal(false);
    triggerNotification("Advertiser saved.");
  };

  const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatDateTime = (ts?: number) => ts ? new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';

  const getRoleLabel = (role: Role) => {
    const roleMap: Record<Role, string> = {
      CENTRAL_ADMIN: 'Central Admin',
      CLINIC_ADMIN: 'Clinic Admin',
      DOCTOR: 'Doctor',
      ASSISTANT: 'Assistant',
      SCREEN: 'Screen Display',
      ADVERTISER: 'Advertiser'
    };
    return roleMap[role] || role;
  };

  const IconButton = ({ children, onClick, className, color = 'slate-600' }: any) => (
    <button 
      className={`btn btn-sm btn-light d-flex align-items-center justify-content-center rounded-circle text-${color} ${className}`} 
      onClick={onClick}
      style={{ width: '30px', height: '30px', padding: '0' }}
    >
      {children}
    </button>
  );

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Deriving unique patients for the main registry page
  const uniquePatients = useMemo(() => {
    const map = new Map<string, {name: string, age: string, gender: string, phone: string, email: string}>();
    
    // Search filter
    const term = registryGlobalSearch.toLowerCase().trim();

    state.tokens.forEach(t => {
      // Basic Main Page Filters
      const matchClinic = !registryClinicId || t.clinicId === registryClinicId;
      if (!matchClinic) return;

      const pName = t.patientName.toLowerCase();
      const pEmail = (t.patientData.email || t.patientEmail || '').toLowerCase();
      const pPhone = (t.patientData.phone || '').toLowerCase();
      
      const matchSearch = !term || pName.includes(term) || pEmail.includes(term) || pPhone.includes(term);
      if (!matchSearch) return;

      const key = `${t.patientName}-${t.patientData.phone}`;
      if (!map.has(key)) {
        map.set(key, {
          name: t.patientName,
          age: t.patientData.age || '-',
          gender: t.patientData.gender || '-',
          phone: t.patientData.phone || '-',
          email: t.patientData.email || t.patientEmail || '-'
        });
      }
    });

    const result = Array.from(map.values());

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        // Handle numeric sorting for age
        if (sortConfig.key === 'age') {
          const numA = parseInt(valA) || 0;
          const numB = parseInt(valB) || 0;
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [state.tokens, registryGlobalSearch, registryClinicId, sortConfig]);

  const patientHistory = useMemo(() => {
    if (!showHistoryModal) return [];
    
    const fFrom = historyFrom ? new Date(historyFrom).getTime() : 0;
    const fTill = historyTill ? new Date(historyTill).getTime() + 86400000 : Infinity;

    return state.tokens.filter(t => {
      const matchIdentity = t.patientName === showHistoryModal.name && t.patientData.phone === showHistoryModal.phone;
      if (!matchIdentity) return false;

      const matchDate = t.timestamp >= fFrom && t.timestamp <= fTill;
      const matchDoctor = !historyDoctor || t.doctorId === historyDoctor;
      const matchStatus = !historyStatus || t.status === historyStatus;
      
      return matchDate && matchDoctor && matchStatus;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [state.tokens, showHistoryModal, historyFrom, historyTill, historyDoctor, historyStatus]);

  const filteredLiveTokens = useMemo(() => {
    const term = liveQueueSearch.toLowerCase().trim();
    return state.tokens
      .filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')
      .filter(t => {
        const matchClinic = !liveQueueClinicId || t.clinicId === liveQueueClinicId;
        
        const pName = t.patientName.toLowerCase();
        const pEmail = (t.patientData.email || t.patientEmail || '').toLowerCase();
        const pPhone = (t.patientData.phone || '').toLowerCase();
        
        const matchSearch = !term || pName.includes(term) || pEmail.includes(term) || pPhone.includes(term);
        
        return matchClinic && matchSearch;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [state.tokens, liveQueueSearch, liveQueueClinicId]);

  return (
    <div className="container-fluid px-0">
      {notification && (
        <div className="position-fixed bottom-0 end-0 m-4 animate-fade-in" style={{ zIndex: 1300 }}>
          <div className={`bg-white border-start border-4 border-${notification.type === 'success' ? 'primary' : 'danger'} shadow-lg rounded-3 p-3`}>
             <div className="fw-bold text-dark small">{notification.message}</div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="row g-4 mb-4">
          <StatCard title="Clinics" value={state.clinics.length} icon="🏥" color="primary" />
          <StatCard title="Active Tokens" value={state.tokens.length} icon="🎟️" color="info" />
          <StatCard title="Advertisers" value={state.advertisers.length} icon="📢" color="success" />
          <StatCard title="Campaigns" value={state.videos.length} icon="🎬" color="warning" />
        </div>
      )}

      {activeTab === 'clinics' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Clinics Management</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingClinic(null); setShowClinicModal(true); }}>Onboard Clinic</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr className="text-nowrap">
                  <th className="ps-3 pe-1">Clinic Name</th>
                  <th className="px-1">Location</th>
                  <th className="px-1">Specialties</th>
                  <th className="px-1">Contact</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.clinics.map(c => (
                  <tr key={c.id}>
                    <td className="ps-3 pe-1 fw-bold text-dark">{c.name}</td>
                    <td className="px-1 text-muted fw-bold">{c.city}, {c.state}</td>
                    <td className="px-1">
                      <div className="d-flex flex-wrap gap-1">
                        {c.specialties.map(s => <span key={s} className="badge bg-light text-dark text-xxs fw-bold px-2">{s}</span>)}
                      </div>
                    </td>
                    <td className="px-1 text-muted fw-medium">{c.email}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-1">
                        <IconButton onClick={() => { setEditingClinic(c); setShowClinicModal(true); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </IconButton>
                        <IconButton color="danger" onClick={() => setShowDeleteConfirm({ id: c.id, type: 'CLINIC', name: c.name })}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'specialties' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Medical Specialties</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingSpecialty(null); setShowSpecialtyModal(true); }}>Add Specialty</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th className="ps-3 pe-1">Specialty Name</th>
                  <th className="text-center px-1">For Clinic</th>
                  <th className="text-center px-1">For Doctors</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.specialties.map(s => (
                  <tr key={s.id}>
                    <td className="ps-3 pe-1 fw-bold text-dark">{s.name}</td>
                    <td className="text-center px-1">
                      <span className={`badge rounded-pill px-3 py-1 fw-bold text-xxs ${s.forClinic ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted'}`}>
                        {s.forClinic ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="text-center px-1">
                      <span className={`badge rounded-pill px-3 py-1 fw-bold text-xxs ${s.forDoctor ? 'bg-primary bg-opacity-10 text-primary' : 'bg-light text-muted'}`}>
                        {s.forDoctor ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-1">
                        <IconButton onClick={() => { setEditingSpecialty(s); setShowSpecialtyModal(true); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </IconButton>
                        <IconButton color="danger" onClick={() => setShowDeleteConfirm({ id: s.id, type: 'SPECIALTY', name: s.name })}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'patient-details' && (
        <div className="animate-fade-in">
          {/* Top Main Registry Search Bar - Compacted with Smaller Font */}
          <div className="card border-0 shadow-sm rounded-4 bg-white mb-3">
            <div className="card-body p-3">
              <div className="row g-2 align-items-end">
                <div className="col-md-5">
                  <label className="text-xxs fw-black text-slate-400 mb-1 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Global Patient Search</label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-slate-400" style={{ fontSize: '0.7rem' }}>🔍</span>
                    <input 
                      type="text" 
                      value={registryGlobalSearch} 
                      onChange={e => setRegistryGlobalSearch(e.target.value)} 
                      placeholder="Name, Phone, Email..." 
                      className="form-control form-control-pro ps-4 py-1.5 fw-bold" 
                      style={{ fontSize: '0.7rem' }}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="text-xxs fw-black text-slate-400 mb-1 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Clinic Filter</label>
                  <SearchableSelect 
                    options={state.clinics.map(c => ({ id: c.id, label: c.name }))}
                    value={registryClinicId}
                    onChange={setRegistryClinicId}
                    placeholder="All Clinics"
                    size="sm"
                  />
                </div>
                <div className="col-md-auto ms-auto">
                   <div className="text-xxs fw-bold text-slate-300 text-uppercase tracking-widest">{uniquePatients.length} Records</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="table-responsive">
              <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr className="text-nowrap text-slate-500 bg-light bg-opacity-50">
                    <th className="ps-4 cursor-pointer hover-bg-slate" onClick={() => requestSort('name')}>
                       <div className="d-flex align-items-center gap-1">
                          Patient Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestSort('age')}>
                       <div className="d-flex align-items-center gap-1">
                          Age {sortConfig?.key === 'age' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestSort('gender')}>
                       <div className="d-flex align-items-center gap-1">
                          Gender {sortConfig?.key === 'gender' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestSort('phone')}>
                       <div className="d-flex align-items-center gap-1">
                          Mobile {sortConfig?.key === 'phone' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestSort('email')}>
                       <div className="d-flex align-items-center gap-1">
                          Email {sortConfig?.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="text-center pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uniquePatients.map((p, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 py-2.5 fw-bold text-dark">{p.name}</td>
                      <td className="px-2">{p.age}</td>
                      <td className="px-2">
                        <span className={`badge rounded-pill px-2 py-1 text-xxs fw-bold ${p.gender === 'Male' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          {p.gender.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 fw-bold text-slate-600">{p.phone}</td>
                      <td className="px-2 text-muted">{p.email}</td>
                      <td className="text-center pe-4">
                        <button 
                          className="btn btn-primary-pro py-1 px-3 text-nowrap"
                          onClick={() => {
                            setHistoryFrom(''); setHistoryTill(''); setHistoryDoctor(''); setHistoryStatus('');
                            setShowHistoryModal({ name: p.name, phone: p.phone });
                          }}
                          style={{ fontSize: '0.65rem' }}
                        >
                          Show History
                        </button>
                      </td>
                    </tr>
                  ))}
                  {uniquePatients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted italic">No records matching your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'live-queue' && (
        <div className="animate-fade-in">
          {/* Live Queue Filter Bar */}
          <div className="card border-0 shadow-sm rounded-4 bg-white mb-3">
            <div className="card-body p-3">
              <div className="row g-2 align-items-end">
                <div className="col-md-5">
                  <label className="text-xxs fw-black text-slate-400 mb-1 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Search Waiting Patients</label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-slate-400" style={{ fontSize: '0.7rem' }}>🔍</span>
                    <input 
                      type="text" 
                      value={liveQueueSearch} 
                      onChange={e => setLiveQueueSearch(e.target.value)} 
                      placeholder="Name, Phone, Email..." 
                      className="form-control form-control-pro ps-4 py-1.5 fw-bold" 
                      style={{ fontSize: '0.7rem' }}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="text-xxs fw-black text-slate-400 mb-1 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Clinic Filter</label>
                  <SearchableSelect 
                    options={state.clinics.map(c => ({ id: c.id, label: c.name }))}
                    value={liveQueueClinicId}
                    onChange={setLiveQueueClinicId}
                    placeholder="All Clinics"
                    size="sm"
                  />
                </div>
                <div className="col-md-auto ms-auto">
                   <div className="text-xxs fw-bold text-slate-300 text-uppercase tracking-widest">{filteredLiveTokens.length} Active Tokens</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white animate-fade-in">
            <div className="table-responsive">
              <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr className="text-nowrap text-slate-500 bg-light bg-opacity-50">
                    <th style={{ width: '40px' }}></th>
                    <th className="pe-2">No.</th>
                    <th className="px-2">Patient</th>
                    <th className="px-2">Clinic</th>
                    <th className="px-2">Group</th>
                    <th className="px-2 text-center">Issued Date/Time</th>
                    <th className="px-2 text-center">Wait</th>
                    <th className="px-2 text-center">Start</th>
                    <th className="px-2 text-center">End</th>
                    <th className="px-2">Cabin</th>
                    <th className="px-2">Doctor</th>
                    <th className="pe-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLiveTokens.map(t => {
                      const clinic = state.clinics.find(c => c.id === t.clinicId);
                      const group = state.groups.find(g => g.id === t.groupId);
                      const cabin = state.cabins.find(c => c.id === t.cabinId);
                      const doctor = state.users.find(u => u.id === (cabin?.currentDoctorId || t.doctorId));
                      const waitMinutes = Math.floor((Date.now() - t.timestamp) / 60000);
                      
                      return (
                        <tr key={t.id}>
                          <td></td>
                          <td className="py-2 fw-black text-primary">{t.tokenInitial ? t.tokenInitial + '-' : ''}{t.number}</td>
                          <td className="px-2 py-2 fw-bold text-dark text-nowrap">{t.patientName}</td>
                          <td className="px-2 py-2">
                              <div className="text-indigo-600 text-xxs fw-black text-uppercase truncate" style={{maxWidth: '120px'}}>{clinic?.name || 'Unknown'}</div>
                          </td>
                          <td className="px-2 py-2"><div className="text-slate-700 text-xxs fw-extrabold text-uppercase tracking-tighter truncate" style={{maxWidth: '100px'}}>{group?.name || 'General'}</div></td>
                          <td className="px-2 py-2 text-center"><div className="text-primary fw-bold text-xxs">{formatDateTime(t.timestamp)}</div></td>
                          <td className="px-2 py-2 text-center">
                              <WaitTimeBadge minutes={waitMinutes} />
                          </td>
                          <td className="px-2 py-2 text-center text-xxs fw-bold text-indigo-600">{formatTime(t.visitStartTime)}</td>
                          <td className="px-2 py-2 text-center text-xxs fw-bold text-success">{formatTime(t.visitEndTime)}</td>
                          <td className="px-2 py-2"><div className="text-xxs fw-bold text-slate-500 text-uppercase truncate" style={{maxWidth: '100px'}}>{cabin?.name || '-'}</div></td>
                          <td className="px-2 py-2"><div className="text-xxs fw-black text-indigo-dark text-uppercase truncate" style={{maxWidth: '120px'}}>{doctor?.name || '-'}</div></td>
                          <td className="pe-3 py-2 text-center"><StatusBadge status={t.status} /></td>
                        </tr>
                      );
                    })}
                  {filteredLiveTokens.length === 0 && (
                    <tr><td colSpan={12} className="text-center py-5 text-muted italic">No active tokens matching your criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'advertisers' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Brand Partners</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingAdvertiser(null); setShowAdvertiserModal(true); }}>Register Advertiser</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead><tr><th className="ps-3 pe-1">Company</th><th className="px-1">Contact Person</th><th className="px-1">Email</th><th className="px-1">Status</th><th className="text-center">Actions</th></tr></thead>
              <tbody>
                {state.advertisers.map(a => (
                  <tr key={a.id}>
                    <td className="ps-3 pe-1 fw-bold text-dark">{a.companyName}</td>
                    <td className="px-1">{a.contactPerson}</td>
                    <td className="px-1">{a.email}</td>
                    <td className="px-1"><span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-1 text-xxs">ACTIVE</span></td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-1">
                        <IconButton onClick={() => { setEditingAdvertiser(a); setShowAdvertiserModal(true); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </IconButton>
                        <IconButton color="danger" onClick={() => setShowDeleteConfirm({ id: a.id, type: 'ADVERTISER', name: a.companyName })}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Active Ad Campaigns</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead><tr><th className="ps-3 pe-1">Campaign Title</th><th className="px-1">Advertiser</th><th className="px-1">Type</th><th className="px-1">Views</th><th className="px-1">Status</th></tr></thead>
              <tbody>
                {state.videos.map(v => (
                  <tr key={v.id}>
                    <td className="ps-3 pe-1 fw-bold text-dark">{v.title}</td>
                    <td className="px-1">{state.advertisers.find(a => a.id === v.advertiserId)?.companyName}</td>
                    <td className="px-1"><span className="badge bg-light text-dark text-xxs fw-bold uppercase px-2">{v.type}</span></td>
                    <td className="px-1 fw-bold text-primary">{v.stats.views.toLocaleString()}</td>
                    <td className="px-1"><span className="badge bg-info bg-opacity-10 text-info fw-bold px-3 py-1 text-xxs">RUNNING</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Platform Users</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>Register User</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead><tr><th className="ps-3 pe-1">Name</th><th className="px-1">Affiliation</th><th className="px-1">Role</th><th className="text-center">Actions</th></tr></thead>
              <tbody>
                {state.users.map(u => (
                  <tr key={u.id}>
                    <td className="ps-3 pe-1">
                       <div className="fw-bold text-dark">{u.name}</div>
                       <div className="text-xxs text-muted fw-bold">{u.email}</div>
                    </td>
                    <td className="px-1">
                      {u.clinicId ? `Clinic: ${state.clinics.find(c => c.id === u.clinicId)?.name}` : 
                       u.advertiserId ? `Advertiser: ${state.advertisers.find(a => a.id === u.advertiserId)?.companyName}` : 
                       'Omni Platform'}
                    </td>
                    <td className="px-1">
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-bold text-xxs">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-1">
                        <IconButton color="indigo-primary" onClick={() => { setResettingUser(u); setShowResetModal(true); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </IconButton>
                        <IconButton onClick={() => { setEditingUser(u); setShowUserModal(true); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </IconButton>
                        <IconButton color="danger" onClick={() => setShowDeleteConfirm({ id: u.id, type: 'USER', name: u.name })}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showUserModal || showClinicModal || showAdvertiserModal || showSpecialtyModal || showResetModal || showDeleteConfirm || showHistoryModal) && (
        <BootstrapModal 
          title={
            showUserModal ? (editingUser ? "Modify Account" : "Register User") :
            showClinicModal ? (editingClinic ? "Edit Profile" : "Register Clinic") :
            showAdvertiserModal ? (editingAdvertiser ? "Edit Brand" : "Register Brand") :
            showSpecialtyModal ? (editingSpecialty ? "Edit Specialty" : "Add Specialty") :
            showHistoryModal ? `Visit History: ${showHistoryModal.name}` :
            showResetModal ? "Force Update" : "Confirm Action"
          } 
          onClose={() => {
            setShowUserModal(false); setShowClinicModal(false); setShowAdvertiserModal(false);
            setShowSpecialtyModal(false); setShowResetModal(false); setShowDeleteConfirm(null);
            setShowHistoryModal(null);
          }} 
          onSave={
            showUserModal ? handleSaveUser :
            showClinicModal ? handleSaveClinic :
            showAdvertiserModal ? handleSaveAdvertiser :
            showSpecialtyModal ? handleSaveSpecialty :
            showHistoryModal ? () => setShowHistoryModal(null) :
            showResetModal ? handleResetPassword : confirmDelete
          }
          saveLabel={showHistoryModal ? "Done" : undefined}
          hideSave={showHistoryModal}
          customWidth={showHistoryModal ? '850px' : undefined}
        >
          {showHistoryModal && (
            <div className="animate-fade-in">
              {/* Internal History Search & Filters */}
              <div className="card border-0 bg-slate-50 rounded-4 mb-4 overflow-hidden shadow-sm">
                <div 
                  className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center cursor-pointer border-bottom"
                  onClick={() => setIsHistoryFilterCollapsed(!isHistoryFilterCollapsed)}
                >
                  <span className="text-xxs fw-black text-slate-500 text-uppercase tracking-widest">Advanced Visit Search</span>
                  <span style={{ transform: isHistoryFilterCollapsed ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
                </div>
                {!isHistoryFilterCollapsed && (
                  <div className="card-body p-3 bg-white">
                    <div className="row g-2">
                      <div className="col-md-3">
                        <label className="text-xxs fw-bold text-slate-500 mb-1 d-block">From</label>
                        <input type="date" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} className="form-control form-control-pro py-1" />
                      </div>
                      <div className="col-md-3">
                        <label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Till</label>
                        <input type="date" value={historyTill} onChange={e => setHistoryTill(e.target.value)} className="form-control form-control-pro py-1" />
                      </div>
                      <div className="col-md-3">
                        <label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Doctor</label>
                        <select value={historyDoctor} onChange={e => setHistoryDoctor(e.target.value)} className="form-select form-control-pro py-1">
                          <option value="">Any</option>
                          {state.users.filter(u => u.role === 'DOCTOR').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Status</label>
                        <select value={historyStatus} onChange={e => setHistoryStatus(e.target.value)} className="form-select form-control-pro py-1">
                          <option value="">Any</option>
                          <option value="WAITING">Waiting</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="table-responsive">
                <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.7rem' }}>
                  <thead>
                    <tr className="bg-light">
                      <th className="ps-2">Token #</th>
                      <th>Clinic</th>
                      <th>Group</th>
                      <th>Doctor</th>
                      <th>Issued Date/Time</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th className="pe-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientHistory.map(h => {
                      const clinic = state.clinics.find(c => c.id === h.clinicId);
                      const group = state.groups.find(g => g.id === h.groupId);
                      const doctor = state.users.find(u => u.id === h.doctorId);
                      return (
                        <tr key={h.id}>
                          <td className="ps-2 fw-black text-primary">{h.tokenInitial ? h.tokenInitial + '-' : ''}{h.number}</td>
                          <td><div className="text-xxs fw-bold text-dark truncate" style={{maxWidth: '80px'}}>{clinic?.name || '-'}</div></td>
                          <td><div className="text-xxs text-muted fw-bold truncate" style={{maxWidth: '80px'}}>{group?.name || '-'}</div></td>
                          <td><div className="text-xxs text-indigo-dark fw-bold truncate" style={{maxWidth: '80px'}}>{doctor?.name || '-'}</div></td>
                          <td>{formatDateTime(h.timestamp)}</td>
                          <td className="text-indigo-600 fw-bold">{formatTime(h.visitStartTime)}</td>
                          <td className="text-success fw-bold">{formatTime(h.visitEndTime)}</td>
                          <td className="pe-2 text-center"><StatusBadge status={h.status} /></td>
                        </tr>
                      );
                    })}
                    {patientHistory.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-4 text-muted italic">No matching visits found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showUserModal && (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Role</label>
                <select className="form-select form-control-pro" value={userRole} onChange={e => setUserRole(e.target.value as Role)}>
                  <option value="CENTRAL_ADMIN">Central Admin</option>
                  <option value="CLINIC_ADMIN">Clinic Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="ASSISTANT">Assistant</option>
                  <option value="SCREEN">Screen User</option>
                  <option value="ADVERTISER">Advertiser</option>
                </select>
              </div>
              <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Full Name</label><input value={userName} onChange={e => setUserName(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Email</label><input value={userEmail} onChange={e => setUserEmail(e.target.value)} className="form-control form-control-pro" /></div>
              {userRole !== 'SCREEN' && <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Phone</label><input value={userPhone} onChange={e => setUserPhone(e.target.value)} className="form-control form-control-pro" /></div>}
              {userRole === 'DOCTOR' && (
                <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Specialty</label>
                  <select className="form-select form-control-pro" value={userSpecialty} onChange={e => setUserSpecialty(e.target.value)}>
                    <option value="">Select Specialty...</option>
                    {state.specialties.filter(s => s.forDoctor).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {!editingUser && <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Password</label><input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} className="form-control form-control-pro" placeholder="••••••••" /></div>}
              {['CLINIC_ADMIN', 'DOCTOR', 'ASSISTANT', 'SCREEN'].includes(userRole) && (
                <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Affiliated Clinic</label>
                  <SearchableSelect 
                    options={state.clinics.map(c => ({ id: c.id, label: c.name }))}
                    value={userClinicId}
                    onChange={setUserClinicId}
                    placeholder="Select Clinic..."
                  />
                </div>
              )}
              {userRole === 'ADVERTISER' && (
                <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Affiliated Brand</label>
                  <select className="form-select form-control-pro" value={userAdvertiserId} onChange={e => setUserAdvertiserId(e.target.value)}>
                    <option value="">Select Brand...</option>
                    {state.advertisers.map(a => <option key={a.id} value={a.id}>{a.companyName}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {showClinicModal && (
            <div className="row g-3">
              <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Clinic Name</label><input value={clinicName} onChange={e => setClinicName(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-md-6">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Specialties</label>
                <MultiSelectDropdown options={state.specialties.filter(s => s.forClinic).map(s => ({ id: s.name, label: s.name }))} selectedIds={clinicSpecialties} onChange={setClinicSpecialties} placeholder="Select..." />
              </div>
              <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Email</label><input value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Phone</label><input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Address</label><textarea value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} className="form-control form-control-pro" rows={2} /></div>
              <div className="col-md-4"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">City</label><input value={clinicCity} onChange={e => setClinicCity(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-md-4"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">State</label><input value={clinicState} onChange={e => setClinicState(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-md-4"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Pin</label><input value={clinicPincode} onChange={e => setClinicPincode(e.target.value)} className="form-control form-control-pro" /></div>
            </div>
          )}

          {showAdvertiserModal && (
            <div className="row g-3">
              <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Company</label><input value={advCompany} onChange={e => setAdvCompany(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Contact Person</label><input value={advContact} onChange={e => setAdvContact(e.target.value)} className="form-control form-control-pro" /></div>
              <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Email</label><input value={advEmail} onChange={e => setAdvEmail(e.target.value)} className="form-control form-control-pro" /></div>
            </div>
          )}

          {showSpecialtyModal && (
            <div className="row g-3">
              <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Name</label><input value={specName} onChange={e => setSpecName(e.target.value)} className="form-control form-control-pro" placeholder="Ex: Cardiology" /></div>
              <div className="col-6">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="specForClinic" checked={specForClinic} onChange={e => setSpecForClinic(e.target.checked)} />
                  <label className="form-check-label text-xxs fw-bold text-uppercase text-slate-600" htmlFor="specForClinic">For Clinic</label>
                </div>
              </div>
              <div className="col-6">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="specForDoctor" checked={specForDoctor} onChange={e => setSpecForDoctor(e.target.checked)} />
                  <label className="form-check-label text-xxs fw-bold text-uppercase text-slate-600" htmlFor="specForDoctor">For Doctors</label>
                </div>
              </div>
            </div>
          )}

          {showResetModal && (
            <div className="mb-4">
              <p className="text-muted small mb-3">Updating for: <span className="fw-bold text-indigo-primary">{resettingUser?.name}</span></p>
              <label className="text-xxs fw-bold text-uppercase mb-1 d-block text-slate-500">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-control form-control-pro" />
            </div>
          )}

          {showDeleteConfirm && (
            <div className="text-center py-3">
              <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-flex mb-3">⚠️</div>
              <h5 className="fw-black text-dark mb-1">Confirm Deletion</h5>
              <p className="text-muted small mb-0">Permanently remove <b>{showDeleteConfirm.name}</b>?</p>
            </div>
          )}
        </BootstrapModal>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-bg-slate:hover { background-color: #f1f5f9; }
        .transition-all { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .cursor-pointer { cursor: pointer; }
        .shadow-text { text-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .table-pro thead th { vertical-align: middle; border-bottom: 2px solid #e2e8f0; transition: background 0.2s; }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="col-md-3">
    <div className="card border-0 shadow-sm p-4 rounded-4 bg-white h-100 transition-all pro-shadow-hover">
      <div className={`bg-${color} bg-opacity-10 text-${color} p-2 rounded-3 h5 mb-2 d-flex align-items-center justify-content-center`} style={{width: '40px', height: '40px'}}>{icon}</div>
      <div className="text-xxs fw-extrabold text-secondary text-uppercase mb-1">{title}</div>
      <div className="h3 fw-extrabold mb-0 tracking-tight">{value}</div>
    </div>
  </div>
);

const WaitTimeBadge = ({ minutes }: { minutes: number }) => {
  const getWaitTimeClasses = (min: number) => {
    if (min >= 45) return 'bg-danger bg-opacity-10 text-danger';
    if (min >= 30) return 'bg-warning bg-opacity-10 text-warning';
    if (min >= 15) return 'bg-primary bg-opacity-10 text-primary';
    if (min >= 10) return 'bg-info bg-opacity-10 text-info';
    return 'bg-success bg-opacity-10 text-success';
  };
  return (
    <span className={`badge rounded-pill ${getWaitTimeClasses(minutes)} fw-bold text-xxs`} style={{ minWidth: '45px', display: 'inline-block' }}>
      {minutes}m
    </span>
  );
};

const StatusBadge = ({ status }: { status: Token['status'] }) => {
  const styles: Record<Token['status'], React.CSSProperties> = {
    WAITING: { color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe' },
    CALLING: { color: '#d97706', background: '#fffbeb', border: '1px solid #fef3c7' },
    CONSULTING: { color: '#4f46e5', background: '#eef2ff', border: '1px solid #e0e7ff' },
    COMPLETED: { color: '#059669', background: '#ecfdf5', border: '1px solid #d1fae5' },
    CANCELLED: { color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2' },
    NO_SHOW: { color: '#ea580c', background: '#fff7ed', border: '1px solid #ffedd5' }
  };
  return (
    <span className="badge rounded-pill px-2 py-1 fw-bold text-xxs text-uppercase" style={{ ...styles[status], minWidth: '70px', display: 'inline-block', textAlign: 'center' }}>
      {status.replace('_', ' ')}
    </span>
  );
};

const MultiSelectDropdown: React.FC<{ options: { id: string, label: string }[], selectedIds: string[], onChange: (ids: string[]) => void, placeholder: string }> = ({ options, selectedIds, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  return (
    <div className="position-relative" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)} className="form-control-pro d-flex flex-wrap gap-2 align-items-center cursor-pointer" style={{ minHeight: '34px' }}>
        {selectedIds.length > 0 ? options.filter((o) => selectedIds.includes(o.id)).map((o) => <span key={o.id} className="badge bg-primary bg-opacity-10 text-primary border px-2 py-1 rounded-pill d-flex align-items-center gap-2" style={{ fontSize: '0.7rem' }}><span>{o.label}</span><span onClick={(e) => { e.stopPropagation(); toggle(o.id); }}>×</span></span>) : <span className="text-muted small">{placeholder}</span>}
      </div>
      {isOpen && <div className="position-absolute w-100 mt-1 bg-white border rounded-3 shadow-lg p-2 animate-fade-in" style={{ zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
        {options.map(o => (
          <div key={o.id} onClick={() => toggle(o.id)} className={`p-2 rounded cursor-pointer d-flex justify-content-between mb-1 ${selectedIds.includes(o.id) ? 'bg-primary bg-opacity-10 text-primary' : 'hover-bg-slate'}`}>
            <span className="fw-bold">{o.label}</span>
            {selectedIds.includes(o.id) && <span>✓</span>}
          </div>
        ))}
      </div>}
    </div>
  );
};

const SearchableSelect: React.FC<{ options: { id: string, label: string }[], value: string, onChange: (id: string) => void, placeholder: string, size?: 'sm' }> = ({ options, value, onChange, placeholder, size }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="position-relative w-100" ref={ref}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={`form-control form-control-pro d-flex justify-content-between align-items-center cursor-pointer ${size === 'sm' ? 'py-1.5' : ''}`}
        style={{ minHeight: size === 'sm' ? '30px' : '34px' }}
      >
        <span className="text-dark fw-bold" style={{ fontSize: size === 'sm' ? '0.7rem' : 'inherit', opacity: selectedOption ? 1 : 0.4 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>▼</span>
      </div>
      
      {isOpen && (
        <div className="position-absolute w-100 mt-1 bg-white border rounded-3 shadow-lg p-2 animate-fade-in" style={{ zIndex: 1500 }}>
          <input 
            autoFocus
            type="text" 
            className="form-control form-control-pro mb-2 py-1" 
            style={{ fontSize: size === 'sm' ? '0.7rem' : 'inherit' }}
            placeholder="Type to search..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div 
              className="p-2 rounded cursor-pointer mb-1 hover-bg-slate"
              style={{ fontSize: size === 'sm' ? '0.7rem' : 'inherit', color: value === '' ? 'var(--primary)' : 'inherit', fontWeight: value === '' ? 'bold' : 'normal' }}
              onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
            >
              {placeholder}
            </div>
            {filteredOptions.map(o => (
              <div 
                key={o.id} 
                onClick={() => { onChange(o.id); setIsOpen(false); setSearchTerm(''); }}
                className="p-2 rounded cursor-pointer mb-1 hover-bg-slate"
                style={{ fontSize: size === 'sm' ? '0.7rem' : 'inherit', color: value === o.id ? 'var(--primary)' : 'inherit', fontWeight: value === o.id ? 'bold' : 'normal' }}
              >
                {o.label}
              </div>
            ))}
            {filteredOptions.length === 0 && <div className="p-2 text-muted italic" style={{ fontSize: size === 'sm' ? '0.7rem' : 'inherit' }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const BootstrapModal = ({ title, children, onClose, onSave, saveLabel, hideSave, customWidth }: any) => (
  <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
    <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden" style={{ maxWidth: customWidth || '750px' }}>
      <div className="px-4 pt-4 pb-2 d-flex justify-content-between align-items-center border-bottom">
        <h6 className="fw-extrabold mb-0 text-uppercase text-indigo-dark" style={{ fontSize: '0.85rem' }}>{title}</h6>
        <button onClick={onClose} className="btn-close-round">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div className="p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>{children}</div>
      <div className="d-flex gap-2 px-4 pb-4">
        {!hideSave && <button onClick={onClose} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.7rem' }}>Cancel</button>}
        <button onClick={onSave} className={`btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase`} style={{ fontSize: '0.7rem' }}>{saveLabel || "Confirm"}</button>
      </div>
    </div>
  </div>
);

export default CentralAdminDashboard;
