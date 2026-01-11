import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, User, Token, Cabin, ClinicGroup } from '../types';

interface Props {
  state: AppState;
  user: User;
  onUpdateTokenStatus: (id: string, status: Token['status'], cabinId?: string) => void;
  onUpdateToken: (t: Token) => void;
  onDeleteToken: (id: string) => void;
  onCreateToken: (name: string, data: Record<string, string>, clinicId: string, formId?: string) => Token;
  onAssignCabin: (cabinId: string, doctorId: string | undefined) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

type QueueSortKey = 'number' | 'patientName' | 'group' | 'timestamp' | 'wait' | 'status';
type PatientSortKey = 'name' | 'age' | 'gender' | 'phone' | 'email';

const DoctorDashboard: React.FC<Props> = ({ 
  state, user, onUpdateTokenStatus, onUpdateToken, onDeleteToken, onCreateToken, onAssignCabin, activeTab, onTabChange 
}) => {
  const clinicId = user.clinicId!;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<{ id: string, name: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<{name: string, phone: string} | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<Token | null>(null);
  const [historyActiveNotes, setHistoryActiveNotes] = useState<{id: string, notes: string} | null>(null);
  const [showQuickIssueModal, setShowQuickIssueModal] = useState<{name: string, phone: string, age: string, gender: string, email: string} | null>(null);
  const [issuedToken, setIssuedToken] = useState<Token | null>(null);
  
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAge, setPAge] = useState('');
  const [pGender, setPGender] = useState('Male');
  const [pEmail, setPEmail] = useState('');
  const [pGroupId, setPGroupId] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [quickIssueGroupId, setQuickIssueGroupId] = useState('');
  
  const [tick, setTick] = useState(0);
  const [callingTokenId, setCallingTokenId] = useState<string | null>(null);

  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueSortConfig, setQueueSortConfig] = useState<{ key: QueueSortKey, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'asc' });

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSortConfig, setPatientSortConfig] = useState<{ key: PatientSortKey, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTill, setHistoryTill] = useState('');
  const [historyDoctor, setHistoryDoctor] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [isHistoryFilterCollapsed, setIsHistoryFilterCollapsed] = useState(true);

  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const myGroups = state.groups.filter(g => g.doctorIds.includes(user.id));
  const [activeGroupId, setActiveGroupId] = useState(myGroups.length > 1 ? 'ALL' : (myGroups[0]?.id || ''));

  useEffect(() => {
    if (activeTab === 'consultation' && activeGroupId === 'ALL' && myGroups.length > 0) {
      setActiveGroupId(myGroups[0].id);
    }
  }, [activeTab, activeGroupId, myGroups]);
  
  const activeGroup = myGroups.find(g => g.id === activeGroupId);
  const activeGroupCabinIds = activeGroupId === 'ALL' 
    ? myGroups.flatMap(g => g.cabinIds) 
    : (activeGroup?.cabinIds || []);

  const cabinsInActiveGroup = state.cabins.filter(c => 
    c.clinicId === clinicId && 
    activeGroupCabinIds.includes(c.id)
  );

  const myOccupiedCabins = state.cabins.filter(c => c.currentDoctorId === user.id);
  const clinicTokens = state.tokens.filter(t => t.clinicId === clinicId);
  const clinicGroups = state.groups.filter(g => g.clinicId === clinicId);

  useEffect(() => {
    if (editingToken) {
      setPName(editingToken.patientName);
      setPPhone(editingToken.patientData.phone || '');
      setPAge(editingToken.patientData.age || '');
      setPGender(editingToken.patientData.gender || 'Male');
      setPEmail(editingToken.patientData.email || '');
      setPGroupId(editingToken.groupId || '');
    } else {
      setPName(''); setPPhone(''); setPAge(''); setPGender('Male'); setPEmail(''); setPGroupId('');
    }
  }, [editingToken, showEditModal, showPatientModal]);

  useEffect(() => {
    if (showNotesModal) setConsultNotes(showNotesModal.patientData.notes || '');
  }, [showNotesModal]);

  const handleClaimCabin = (cabinId: string) => onAssignCabin(cabinId, user.id);
  const handleUnassignCabin = (cabinId: string) => onAssignCabin(cabinId, undefined);

  const filteredSortedQueue = useMemo(() => {
    let result = state.tokens.filter(t => 
      (activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId) && 
      (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')
    );
    const query = queueSearchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(t => 
        t.patientName.toLowerCase().includes(query) ||
        (t.patientData.email || '').toLowerCase().includes(query) ||
        (t.patientData.phone || '').toLowerCase().includes(query)
      );
    }
    if (queueSortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        switch (queueSortConfig.key) {
          case 'number': valA = a.number; valB = b.number; break;
          case 'patientName': valA = a.patientName.toLowerCase(); valB = b.patientName.toLowerCase(); break;
          case 'group':
            valA = (state.groups.find(g => g.id === a.groupId)?.name || '').toLowerCase();
            valB = (state.groups.find(g => g.id === b.groupId)?.name || '').toLowerCase();
            break;
          case 'timestamp':
          case 'wait': valA = a.timestamp; valB = b.timestamp; break;
          case 'status': valA = a.status; valB = b.status; break;
          default: return 0;
        }
        if (valA < valB) return queueSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return queueSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => a.timestamp - b.timestamp);
    }
    return result;
  }, [state.tokens, activeGroupId, myGroups, queueSearchQuery, queueSortConfig, state.groups]);

  const uniquePatients = useMemo(() => {
    const map = new Map<string, {name: string, age: string, gender: string, phone: string, email: string}>();
    const term = patientSearchQuery.toLowerCase().trim();
    clinicTokens.forEach(t => {
      const pNameLow = t.patientName.toLowerCase();
      const pEmail = (t.patientData.email || t.patientEmail || '').toLowerCase();
      const pPhone = (t.patientData.phone || '').toLowerCase();
      const matchSearch = !term || pNameLow.includes(term) || pEmail.includes(term) || pPhone.includes(term);
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
    if (patientSortConfig) {
      result.sort((a, b) => {
        const valA = a[patientSortConfig.key];
        const valB = b[patientSortConfig.key];
        if (patientSortConfig.key === 'age') {
          const numA = parseInt(valA) || 0;
          const numB = parseInt(valB) || 0;
          return patientSortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        if (valA < valB) return patientSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return patientSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [clinicTokens, patientSearchQuery, patientSortConfig]);

  const patientHistory = useMemo(() => {
    if (!showHistoryModal) return [];
    const fFrom = historyFrom ? new Date(historyFrom).getTime() : 0;
    const fTill = historyTill ? new Date(historyTill).getTime() + 86400000 : Infinity;
    return clinicTokens.filter(t => {
      const matchIdentity = t.patientName === showHistoryModal.name && t.patientData.phone === showHistoryModal.phone;
      if (!matchIdentity) return false;
      const matchDate = t.timestamp >= fFrom && t.timestamp <= fTill;
      const matchDoctor = !historyDoctor || t.doctorId === historyDoctor;
      const matchStatus = !historyStatus || t.status === historyStatus;
      return matchDate && matchDoctor && matchStatus;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [clinicTokens, showHistoryModal, historyFrom, historyTill, historyDoctor, historyStatus]);

  const waitingTokens = useMemo(() => filteredSortedQueue.filter(t => t.status === 'WAITING'), [filteredSortedQueue]);
  
  const unfilteredWaitingTokens = useMemo(() => {
    return state.tokens
      .filter(t => t.status === 'WAITING' && (activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId))
      .sort((a, b) => a.timestamp - b.timestamp);
   }, [state.tokens, activeGroupId, myGroups]);

  const handleCallNext = (cabinId: string) => {
    if (unfilteredWaitingTokens.length > 0) {
      const tokenId = unfilteredWaitingTokens[0].id;
      onUpdateTokenStatus(tokenId, 'CALLING', cabinId);
      setCallingTokenId(tokenId);
      setTimeout(() => setCallingTokenId(null), 3000);
    }
  };

  const handleRepeatCall = (tokenId: string) => {
    onUpdateTokenStatus(tokenId, 'CALLING');
    setCallingTokenId(tokenId);
    setTimeout(() => setCallingTokenId(null), 3000);
  };

  const handleStartConsulting = (tokenId: string) => onUpdateTokenStatus(tokenId, 'CONSULTING');
  const handleEndConsulting = (tokenId: string) => onUpdateTokenStatus(tokenId, 'COMPLETED');
  const handleNoShow = (tokenId: string) => onUpdateTokenStatus(tokenId, 'NO_SHOW');

  const handleSavePatient = () => {
    if (!pName) return;
    const patientData: Record<string, string> = { phone: pPhone, age: pAge, gender: pGender, email: pEmail };
    if (editingToken) {
      onUpdateToken({ ...editingToken, patientName: pName, patientData: patientData, groupId: pGroupId || editingToken.groupId });
    } else {
      if (!pGroupId) { alert("Select a group for check-in."); return; }
      const group = state.groups.find(g => g.id === pGroupId);
      if (group) onCreateToken(pName, patientData, clinicId, group.formId);
    }
    setShowEditModal(false); setShowPatientModal(false); setEditingToken(null);
  };

  const handleQuickIssue = () => {
    if (!showQuickIssueModal || !quickIssueGroupId) return;
    const group = state.groups.find(g => g.id === quickIssueGroupId);
    if (!group) return;
    const patientData = { phone: showQuickIssueModal.phone, age: showQuickIssueModal.age, gender: showQuickIssueModal.gender, email: showQuickIssueModal.email };
    const newToken = onCreateToken(showQuickIssueModal.name, patientData, clinicId, group.formId);
    setIssuedToken(newToken);
  };

  const handleSaveNotes = () => {
    if (!showNotesModal) return;
    onUpdateToken({
      ...showNotesModal,
      patientData: { ...showNotesModal.patientData, notes: consultNotes }
    });
    setShowNotesModal(null);
  };

  const executeDelete = () => { if (showDeleteConfirm) { onDeleteToken(showDeleteConfirm.id); setShowDeleteConfirm(null); } };
  const executeCancel = () => { if (showCancelConfirm) { onUpdateTokenStatus(showCancelConfirm.id, 'CANCELLED'); setShowCancelConfirm(null); } };
  const getActiveTokenForCabin = (cabinId: string) => state.tokens.find(t => (t.status === 'CALLING' || t.status === 'CONSULTING') && t.cabinId === cabinId);
  const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatDateTime = (ts?: number) => ts ? new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';
  const toggleTokenExpand = (tokenId: string) => setExpandedTokenId(prev => prev === tokenId ? null : tokenId);

  const requestQueueSort = (key: QueueSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (queueSortConfig && queueSortConfig.key === key && queueSortConfig.direction === 'asc') direction = 'desc';
    setQueueSortConfig({ key, direction });
  };

  const requestPatientSort = (key: PatientSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (patientSortConfig && patientSortConfig.key === key && patientSortConfig.direction === 'asc') direction = 'desc';
    setPatientSortConfig({ key, direction });
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

  const IconButton = ({ children, onClick, className, color = 'slate-600', title }: any) => (
    <button 
      className={`btn btn-sm btn-light d-flex align-items-center justify-content-center rounded-circle text-${color} ${className}`} 
      onClick={onClick}
      title={title}
      style={{ width: '32px', height: '32px', padding: '0' }}
    >
      {children}
    </button>
  );

  const nextTokensToDisplay = useMemo(() => {
    const getNextForGroup = (groupId: string) => state.tokens.filter(t => t.groupId === groupId && t.status === 'WAITING').sort((a, b) => a.timestamp - b.timestamp)[0];
    if (activeGroupId === 'ALL') return myGroups.map(g => ({ group: g, token: getNextForGroup(g.id) }));
    const g = myGroups.find(g => g.id === activeGroupId);
    return g ? [{ group: g, token: getNextForGroup(g.id) }] : [];
  }, [state.tokens, myGroups, activeGroupId]);

  const stats = {
    total: state.tokens.filter(t => activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId).filter(t => t.status !== 'CANCELLED' && t.status !== 'NO_SHOW').length,
    inQueue: waitingTokens.length,
    attended: state.tokens.filter(t => activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId).filter(t => t.status === 'COMPLETED').length,
    noShow: state.tokens.filter(t => activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId).filter(t => t.status === 'NO_SHOW').length
  };

  const completionRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  return (
    <div className="container-fluid p-0">
      <div className="row g-2 mb-3 mt-n2 animate-fade-in">
        <StatCard title="Total Patients" value={stats.total} icon="👥" color="primary" />
        <StatCard title="In Queue" value={stats.inQueue} icon="⏱️" color="warning" />
        <StatCard title="Attended" value={stats.attended} icon="✅" color="success" />
        <StatCard title="No Shows" value={stats.noShow} icon="🚫" color="danger" />
      </div>

      {activeTab === 'dashboard' && (
        <div className="row g-3 animate-fade-in">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
               <div className="mb-4">
                 <div className="d-flex gap-2 overflow-auto pb-1 no-scrollbar">
                    {myGroups.length > 1 && (
                      <button
                        onClick={() => setActiveGroupId('ALL')}
                        className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${
                          activeGroupId === 'ALL' ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover-bg-slate'
                        }`}
                        style={{ fontSize: '0.65rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}
                      >
                        All Groups
                      </button>
                    )}
                    {myGroups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setActiveGroupId(g.id)}
                        className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${
                          activeGroupId === g.id ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover-bg-slate'
                        }`}
                        style={{ fontSize: '0.65rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}
                      >
                        {g.name}
                      </button>
                    ))}
                 </div>
               </div>
               <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h5 className="fw-black text-indigo-dark mb-1">Performance Details</h5>
                    <p className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-0">Group Context: {activeGroupId === 'ALL' ? 'All Assigned Wings' : activeGroup?.name}</p>
                  </div>
                  <div className="text-end">
                    <span className="h3 fw-black text-primary mb-0">{completionRate}%</span>
                    <p className="text-xxs fw-bold text-slate-400 text-uppercase tracking-widest mb-0">Efficiency</p>
                  </div>
               </div>
               <div className="mb-4"><div className="progress rounded-pill" style={{ height: '12px', backgroundColor: '#f1f5f9' }}><div className="progress-bar bg-primary rounded-pill transition-all" style={{ width: `${completionRate}%` }}></div></div></div>
               <div className="row g-3">
                 <div className="col-md-6"><div className="p-3 border rounded-4 bg-slate-50"><h6 className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-3">Currently Active At</h6>{myOccupiedCabins.length > 0 ? (<div className="d-flex flex-wrap gap-2">{myOccupiedCabins.map(c => (<span key={c.id} className="badge bg-indigo-dark text-white px-3 py-2 rounded-3 fw-bold shadow-sm">{c.name}</span>))}</div>) : (<p className="text-muted small italic mb-0">Not logged into any rooms</p>)}</div></div>
                 <div className="col-md-6"><div className="p-3 border rounded-4 bg-slate-50"><h6 className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-3">Queue Summary</h6><div className="d-flex justify-content-between align-items-center mb-1"><span className="small text-slate-600 fw-bold">Next Token:</span><span className="small fw-black text-primary">{unfilteredWaitingTokens[0] ? (unfilteredWaitingTokens[0].tokenInitial ? unfilteredWaitingTokens[0].tokenInitial + '-' : '') + unfilteredWaitingTokens[0].number : 'NONE'}</span></div><div className="d-flex justify-content-between align-items-center"><span className="small text-slate-600 fw-bold">Avg Wait Time:</span><span className="small fw-black text-dark">~15m</span></div></div></div>
               </div>
            </div>
          </div>
          <div className="col-lg-4"><div className="card border-0 shadow-sm rounded-4 bg-indigo-dark text-white p-4 h-100 overflow-hidden position-relative"><div className="position-relative z-1"><h5 className="fw-black mb-3">Quick Actions</h5><button onClick={() => onTabChange?.('consultation')} className="btn btn-light w-100 py-3 rounded-4 fw-black text-uppercase shadow-sm mb-3" style={{ fontSize: '0.75rem' }}>Start Consultations</button><div className="p-3 bg-white bg-opacity-10 rounded-4 border border-white border-opacity-10"><p className="small mb-2 fw-bold opacity-75">Dr. {user.name}</p><p className="text-xxs fw-black text-uppercase tracking-widest opacity-50 mb-0">Specialty: {user.specialty}</p></div></div><div className="position-absolute bottom-0 end-0 p-3 opacity-10" style={{ fontSize: '8rem', transform: 'translate(20%, 20%)' }}>🩺</div></div></div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="animate-fade-in">
          <div className="row g-2 mb-3">
            <div className="col-12">
              <div className="d-flex gap-2 overflow-auto pb-1 align-items-center">
                <div className="d-flex gap-2 overflow-auto flex-grow-1 no-scrollbar">
                  {myGroups.length > 1 && (
                    <button
                      onClick={() => setActiveGroupId('ALL')}
                      className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${
                        activeGroupId === 'ALL' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-400 hover-bg-slate'
                      }`}
                      style={{ fontSize: '0.68rem', padding: '0.4rem 1.05rem', whiteSpace: 'nowrap' }}
                    >
                      All Groups
                      <span className={`badge rounded-pill ${activeGroupId === 'ALL' ? 'bg-white text-primary' : 'bg-light text-muted'}`}>
                        {state.tokens.filter(t => myGroups.some(mg => mg.id === t.groupId) && (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')).length}
                      </span>
                    </button>
                  )}
                  {myGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGroupId(g.id)}
                      className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${
                        activeGroupId === g.id ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-400 hover-bg-slate'
                      }`}
                      style={{ fontSize: '0.68rem', padding: '0.4rem 1.05rem', whiteSpace: 'nowrap' }}
                    >
                      {g.name}
                      <span className={`badge rounded-pill ${activeGroupId === g.id ? 'bg-white text-primary' : 'bg-light text-muted'}`}>
                        {state.tokens.filter(t => t.groupId === g.id && (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="bg-white border rounded-3 d-flex align-items-center gap-2 shadow-sm text-nowrap no-scrollbar overflow-x-auto" style={{ fontSize: '0.68rem', padding: '0.4rem 1.05rem', border: '1px solid #e2e8f0', maxWidth: '40%' }}>
                  <span className="fw-black text-slate-400 text-uppercase tracking-widest">Next:</span>
                  <div className="d-flex gap-2 align-items-center">
                    {nextTokensToDisplay.length > 0 ? (nextTokensToDisplay.map(({ group, token }, idx) => (
                      <React.Fragment key={group.id}>
                        {idx > 0 && <span className="text-slate-200 fw-light">|</span>}
                        <div className="d-flex align-items-center gap-1">
                          {activeGroupId === 'ALL' && <span className="text-xxs fw-bold text-slate-400">{group.tokenInitial}:</span>}
                          <span className="fw-black text-primary">{token ? `${token.tokenInitial ? token.tokenInitial + '-' : ''}${token.number}` : '--'}</span>
                        </div>
                      </React.Fragment>
                    ))) : (<span className="fw-black text-slate-300">--</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
               <h5 className="fw-extrabold text-dark mb-0" style={{ fontSize: '0.9rem' }}>Aggregated Live Queue</h5>
               <div className="d-flex align-items-center gap-3 flex-grow-1 justify-content-md-end">
                  <div className="position-relative" style={{ maxWidth: '240px', width: '100%' }}>
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-slate-400" style={{ fontSize: '0.7rem' }}>🔍</span>
                    <input 
                      type="text" 
                      value={queueSearchQuery} 
                      onChange={e => setQueueSearchQuery(e.target.value)} 
                      placeholder="Search Patient..." 
                      className="form-control form-control-pro ps-4 py-1.5 fw-bold" 
                      style={{ fontSize: '0.7rem' }}
                    />
                  </div>
                  <button className="btn btn-primary-pro text-nowrap" onClick={() => { setEditingToken(null); setPGroupId(activeGroupId === 'ALL' ? '' : activeGroupId); setShowPatientModal(true); }}>Manual Check-in</button>
               </div>
            </div>
            <div className="table-responsive">
              <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr className="text-nowrap text-slate-500 bg-light bg-opacity-50">
                    <th style={{ width: '40px' }}></th>
                    <th className="pe-2 cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('number')}>No. {queueSortConfig?.key === 'number' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('patientName')}>Patient {queueSortConfig?.key === 'patientName' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('group')}>Group {queueSortConfig?.key === 'group' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-2 text-center cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('timestamp')}>Issued {queueSortConfig?.key === 'timestamp' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-2 text-center cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('wait')}>Wait {queueSortConfig?.key === 'wait' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="px-2">Cabin</th>
                    <th className="px-2">Doctor</th>
                    <th className="px-2 text-center cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('status')}>Status {queueSortConfig?.key === 'status' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th className="pe-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedQueue.map(t => {
                      const isExpanded = expandedTokenId === t.id;
                      const cabin = state.cabins.find(c => c.id === t.cabinId);
                      const doctor = state.users.find(u => u.id === cabin?.currentDoctorId);
                      const tokenGroup = state.groups.find(g => g.id === t.groupId);
                      const waitMinutes = Math.floor((Date.now() - t.timestamp) / 60000);
                      return (
                        <React.Fragment key={t.id}>
                          <tr className={`${isExpanded ? 'bg-light bg-opacity-50' : ''} transition-all`}>
                            <td className="text-center">
                              <button className="btn btn-sm p-0 border-0 shadow-none text-slate-400" onClick={() => toggleTokenExpand(t.id)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                                  <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                              </button>
                            </td>
                            <td className="py-2 fw-black text-primary">{t.tokenInitial ? t.tokenInitial + '-' : ''}{t.number}</td>
                            <td className="px-2 py-2 fw-bold text-dark text-nowrap">{t.patientName}</td>
                            <td className="px-2 py-2"><div className="text-slate-700 text-xxs fw-extrabold text-uppercase tracking-tighter truncate" style={{maxWidth: '100px'}}>{tokenGroup?.name || 'General'}</div></td>
                            <td className="px-2 py-2 text-center"><div className="text-primary fw-bold text-xxs">{formatTime(t.timestamp)}</div></td>
                            <td className="px-2 py-2 text-center"><WaitTimeBadge minutes={waitMinutes} /></td>
                            <td className="px-2 py-2"><div className="text-xxs fw-bold text-slate-500 text-uppercase truncate" style={{maxWidth: '80px'}}>{cabin?.name || '-'}</div></td>
                            <td className="px-2 py-2"><div className="text-xxs fw-black text-indigo-dark text-uppercase truncate" style={{maxWidth: '80px'}}>{doctor?.name || '-'}</div></td>
                            <td className="px-2 py-2 text-center"><StatusBadge status={t.status} /></td>
                            <td className="pe-3 py-2 text-center">
                              <div className="d-flex justify-content-center gap-1">
                                <IconButton title="Edit Patient" onClick={() => { setEditingToken(t); setShowPatientModal(true); }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </IconButton>
                                <IconButton title="Cancel Token" color="danger" onClick={() => setShowCancelConfirm({ id: t.id, name: t.patientName })}>
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-light bg-opacity-30 border-bottom animate-fade-in">
                              <td colSpan={10} className="p-0">
                                <div className="p-4 bg-white m-3 rounded-4 shadow-sm border border-slate-100">
                                   <div className="row g-4">
                                      <div className="col-md-3"><div className="text-xxs fw-black text-slate-400 text-uppercase mb-1 tracking-widest">Age</div><div className="fw-black text-dark">{t.patientData.age || '-'} Years</div></div>
                                      <div className="col-md-3"><div className="text-xxs fw-black text-slate-400 text-uppercase mb-1 tracking-widest">Gender</div><div className="fw-black text-dark">{t.patientData.gender || '-'}</div></div>
                                      <div className="col-md-3"><div className="text-xxs fw-black text-slate-400 text-uppercase mb-1 tracking-widest">Phone Number</div><div className="fw-black text-dark">{t.patientData.phone || '-'}</div></div>
                                      <div className="col-md-3"><div className="text-xxs fw-black text-slate-400 text-uppercase mb-1 tracking-widest">Email Address</div><div className="fw-black text-dark">{t.patientData.email || '-'}</div></div>
                                   </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  {filteredSortedQueue.length === 0 && (<tr><td colSpan={10} className="text-center py-5 text-muted italic">No patients in queue matching selection.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="animate-fade-in">
          <div className="card border-0 shadow-sm rounded-4 bg-white mb-3">
            <div className="card-body p-3">
              <div className="row g-2 align-items-end">
                <div className="col-md-6">
                  <label className="text-xxs fw-black text-slate-400 mb-1 d-block text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Patient Search</label>
                  <div className="position-relative">
                    <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-slate-400" style={{ fontSize: '0.7rem' }}>🔍</span>
                    <input 
                      type="text" 
                      value={patientSearchQuery} 
                      onChange={e => setPatientSearchQuery(e.target.value)} 
                      placeholder="Name, Phone, Email..." 
                      className="form-control form-control-pro ps-4 py-1.5 fw-bold" 
                      style={{ fontSize: '0.7rem' }}
                    />
                  </div>
                </div>
                <div className="col-md-auto ms-auto d-flex align-items-center gap-3">
                   <div className="text-xxs fw-bold text-slate-300 text-uppercase tracking-widest">{uniquePatients.length} Registered Patients</div>
                   <button className="btn btn-primary-pro text-nowrap px-4 py-2" onClick={() => { setEditingToken(null); setShowPatientModal(true); }}>
                     <span className="me-2">+</span> Manual Check-in
                   </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Patients Register</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr className="text-nowrap text-slate-500 bg-light bg-opacity-50">
                    <th className="ps-4 cursor-pointer hover-bg-slate" onClick={() => requestPatientSort('name')}>
                       <div className="d-flex align-items-center gap-1">
                          Patient Name {patientSortConfig?.key === 'name' && (patientSortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestPatientSort('age')}>
                       <div className="d-flex align-items-center gap-1">
                          Age {patientSortConfig?.key === 'age' && (patientSortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestPatientSort('gender')}>
                       <div className="d-flex align-items-center gap-1">
                          Gender {patientSortConfig?.key === 'gender' && (patientSortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestPatientSort('phone')}>
                       <div className="d-flex align-items-center gap-1">
                          Mobile {patientSortConfig?.key === 'phone' && (patientSortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestPatientSort('email')}>
                       <div className="d-flex align-items-center gap-1">
                          Email {patientSortConfig?.key === 'email' && (patientSortConfig.direction === 'asc' ? '↑' : '↓')}
                       </div>
                    </th>
                    <th className="text-center px-1">Token</th>
                    <th className="text-center pe-4">History</th>
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
                      <td className="text-center px-1">
                        <button 
                          className="btn btn-primary-pro py-1 px-3 text-nowrap"
                          onClick={() => {
                            setIssuedToken(null);
                            setQuickIssueGroupId('');
                            setShowQuickIssueModal(p);
                          }}
                          style={{ fontSize: '0.65rem' }}
                        >
                          Generate
                        </button>
                      </td>
                      <td className="text-center pe-4">
                        <button 
                          className="btn py-1 px-3 text-nowrap fw-bold text-white shadow-none border-0 transition-all hover-shadow"
                          onClick={() => {
                            setHistoryFrom(''); setHistoryTill(''); setHistoryDoctor(''); setHistoryStatus('');
                            setHistoryActiveNotes(null);
                            setShowHistoryModal({ name: p.name, phone: p.phone });
                          }}
                          style={{ fontSize: '0.65rem', backgroundColor: '#10b981' }}
                        >
                          Show History
                        </button>
                      </td>
                    </tr>
                  ))}
                  {uniquePatients.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-5 text-muted italic">No patients found matching criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'consultation' && (
        <div className="row g-2 animate-fade-in">
          <div className="col-12 mb-1">
            <div className="d-flex gap-2 overflow-auto pb-1 align-items-center">
              <div className="d-flex gap-2 overflow-auto flex-grow-1 no-scrollbar">
                {myGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${
                      activeGroupId === g.id ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-400 hover-bg-slate'
                    }`}
                    style={{ fontSize: '0.68rem', padding: '0.4rem 1.05rem', whiteSpace: 'nowrap' }}
                  >
                    {g.name}
                    <span className={`badge rounded-pill ${activeGroupId === g.id ? 'bg-white text-primary' : 'bg-light text-muted'}`}>
                      {state.tokens.filter(t => t.groupId === g.id && (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="bg-white border rounded-3 d-flex align-items-center gap-2 shadow-sm text-nowrap no-scrollbar overflow-x-auto" style={{ fontSize: '0.68rem', padding: '0.4rem 1.05rem', border: '1px solid #e2e8f0', maxWidth: '40%' }}>
                <span className="fw-black text-slate-400 text-uppercase tracking-widest">Next:</span>
                <div className="d-flex gap-2 align-items-center">
                  {nextTokensToDisplay.length > 0 ? (nextTokensToDisplay.map(({ group, token }, idx) => (
                    <React.Fragment key={group.id}>
                      {idx > 0 && <span className="text-slate-200 fw-light">|</span>}
                      <div className="d-flex align-items-center gap-1">
                        {activeGroupId === 'ALL' && <span className="text-xxs fw-bold text-slate-400">{group.tokenInitial}:</span>}
                        <span className="fw-black text-primary">{token ? `${token.tokenInitial ? token.tokenInitial + '-' : ''}${token.number}` : '--'}</span>
                      </div>
                    </React.Fragment>
                  ))) : (<span className="fw-black text-slate-300">--</span>)}
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="row g-3">
              {[...cabinsInActiveGroup].sort((a, b) => {
                const isAMine = a.currentDoctorId === user.id;
                const isBMine = b.currentDoctorId === user.id;
                if (isAMine && !isBMine) return -1;
                if (!isAMine && isBMine) return 1;
                return 0;
              }).map(cabin => {
                const isMine = cabin.currentDoctorId === user.id;
                const isOccupiedByOther = cabin.currentDoctorId && cabin.currentDoctorId !== user.id;
                const isVacant = !cabin.currentDoctorId;
                const activeToken = getActiveTokenForCabin(cabin.id);
                const otherDoctor = isOccupiedByOther ? state.users.find(u => u.id === cabin.currentDoctorId) : null;
                let canNoShow = false;
                let secondsLeft = 0;
                if (activeToken?.status === 'CALLING' && activeToken.visitStartTime) {
                  const elapsed = (Date.now() - activeToken.visitStartTime) / 1000;
                  secondsLeft = Math.max(0, 30 - Math.floor(elapsed));
                  canNoShow = elapsed >= 30;
                }
                const isCurrentBeingCalled = activeToken && callingTokenId === activeToken.id;
                return (
                  <div className="col-12 col-md-6 col-lg-3 col-xl-custom" key={cabin.id}>
                    <div className={`card border-0 shadow-sm rounded-4 bg-white text-center d-flex flex-column transition-all border-top border-4 ${isOccupiedByOther ? 'opacity-90' : ''}`} style={{ minHeight: '240px', borderTopColor: isMine ? '#2563eb' : '#F0F4F8' }}>
                      <div className="py-2 px-3 border-bottom rounded-top-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#F0F4F8' }}>
                        <span className="fw-black text-slate-700 text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>{cabin.name}</span>
                        {isMine && (<button onClick={() => handleUnassignCabin(cabin.id)} className="btn btn-danger px-1.5 py-1 rounded-3 text-uppercase fw-black text-white border-0 transition-all shadow-sm" style={{ backgroundColor: '#ef4444', fontSize: '0.6rem' }}>Leave</button>)}
                        {isVacant && (<button onClick={() => handleClaimCabin(cabin.id)} className="btn btn-success px-1.5 py-1 rounded-3 text-uppercase fw-black text-white border-0 transition-all shadow-sm" style={{ backgroundColor: '#10b981', fontSize: '0.6rem' }}>Assign</button>)}
                        {isOccupiedByOther && (<span className="badge bg-warning text-white px-1.5 py-1 rounded-pill fw-black text-uppercase tracking-widest shadow-sm" style={{ fontSize: '0.55rem', backgroundColor: '#FBBF24' }}>Busy</span>)}
                      </div>
                      <div className="p-3 flex-grow-1 d-flex flex-column justify-content-center align-items-center position-relative">
                        {isMine ? (activeToken ? (
                            <div className="animate-fade-in w-100 h-100 d-flex flex-column justify-content-center align-items-center">
                              <div className="position-absolute top-0 start-0 p-1"><button onClick={() => handleRepeatCall(activeToken.id)} className={`btn btn-outline-primary px-1.5 py-1 rounded-3 text-uppercase fw-black shadow-none border-2 transition-all ${isCurrentBeingCalled ? 'animate-pulse bg-primary text-white border-primary' : ''}`} style={{ fontSize: '0.55rem' }}>{isCurrentBeingCalled ? '📢 CALL' : 'Repeat 📢'}</button></div>
                              <div className={`badge ${activeToken.status === 'CALLING' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-success bg-opacity-10 text-success'} px-2 py-0.5 rounded-pill fw-black text-uppercase tracking-widest mb-1`} style={{ fontSize: '0.55rem' }}>{activeToken.status === 'CALLING' ? 'Calling' : 'Consulting'}</div>
                              <div className="mb-1"><span className={`badge bg-primary px-2 py-0.5 rounded-2 fw-black text-white shadow-sm transition-all ${isCurrentBeingCalled ? 'scale-up' : ''}`} style={{ fontSize: '0.9rem' }}>{activeToken.tokenInitial ? activeToken.tokenInitial + '-' : ''}{activeToken.number}</span></div>
                              <div className="d-flex align-items-center justify-content-center gap-1 mb-0"><h4 className="fw-black text-indigo-dark tracking-tighter mb-0 text-truncate" style={{ fontSize: '1.1rem', maxWidth: '85%' }}>{activeToken.patientName}</h4><button onClick={() => { setEditingToken(activeToken); setShowEditModal(true); }} className="btn btn-sm btn-light p-0 rounded-circle border-0 text-slate-400" style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button></div>
                              <div className="mb-2"><p className="fw-black text-slate-500 text-uppercase tracking-widest mb-0" style={{ fontSize: '0.65rem' }}>{activeToken.patientData.age ? `${activeToken.patientData.age}Y` : 'Age N/A'} • {activeToken.patientData.gender || 'N/A'}</p></div>
                              <div className="container-fluid px-1 mt-2">
                                <div className="row g-2">
                                  {activeToken.status === 'CALLING' ? (
                                    <>
                                      <div className="col-6"><button onClick={() => handleStartConsulting(activeToken.id)} className="btn btn-primary-pro w-100 py-1.5 rounded-3 text-uppercase fw-black shadow-sm" style={{ fontSize: '0.65rem' }}>Start</button></div>
                                      <div className="col-6"><button onClick={() => handleNoShow(activeToken.id)} disabled={!canNoShow} className="btn w-100 py-1.5 rounded-3 text-uppercase fw-black shadow-none transition-all" style={{ fontSize: '0.65rem', backgroundColor: canNoShow ? '#dc2626' : 'transparent', color: canNoShow ? 'white' : '#dc2626', border: canNoShow ? 'none' : '2px solid #dc2626', opacity: 1 }}>{canNoShow ? 'No Show' : `${secondsLeft}s`}</button></div>
                                    </>
                                  ) : (
                                    <div className="col-12"><button onClick={() => handleEndConsulting(activeToken.id)} className="btn btn-success w-100 py-2 rounded-3 text-uppercase fw-black text-white shadow-sm mb-2" style={{ fontSize: '0.68rem', backgroundColor: '#10b981', border: 'none' }}>Complete Visit</button></div>
                                  )}
                                  <div className="col-6">
                                    <button onClick={() => setShowHistoryModal({ name: activeToken.patientName, phone: activeToken.patientData.phone })} className="btn btn-light w-100 py-2 rounded-3 text-uppercase fw-black text-indigo-600 border-0 shadow-none d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '0.62rem', backgroundColor: '#eef2ff' }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> History
                                    </button>
                                  </div>
                                  <div className="col-6">
                                    <button onClick={() => setShowNotesModal(activeToken)} className="btn btn-light w-100 py-2 rounded-3 text-uppercase fw-black text-teal-600 border-0 shadow-none d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '0.62rem', backgroundColor: '#f0fdfa', color: '#0d9488' }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 5h2M11 9h2M11 13h2M11 17h2M7 5h2M7 9h2M7 13h2M7 17h2M15 5h2M15 9h2M15 13h2M15 17h2"></path></svg> Notes
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (<div className="py-1 w-100 animate-fade-in"><div className="h4 mb-2 opacity-25">⏳</div><h6 className="fw-black text-slate-400 text-uppercase tracking-widest mb-2" style={{ fontSize: '0.7rem' }}>Room Ready</h6><button onClick={() => handleCallNext(cabin.id)} disabled={unfilteredWaitingTokens.length === 0} className="btn btn-primary-pro w-100 py-2 rounded-3 text-uppercase fw-black shadow-lg" style={{ fontSize: '0.7rem' }}>{unfilteredWaitingTokens.length > 0 ? `Call Next` : 'No Patients'}</button></div>)
                        ) : (<div className="opacity-50 py-1"><div className="h3 mb-1">🔒</div><p className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-0">{isOccupiedByOther ? `Dr. ${otherDoctor?.name}` : 'Assign Room'}</p></div>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(showPatientModal || showEditModal) && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '480px' }}>
             <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
               <h6 className="fw-black mb-0 text-uppercase tracking-tight text-indigo-dark">{editingToken ? "Update Patient Record" : "Manual Check-in"}</h6>
               <button onClick={() => { setShowPatientModal(false); setShowEditModal(false); setEditingToken(null); }} className="btn-close-round"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
             </div>
             <div className="p-4">
                <div className="row g-3">
                   <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Target Group</label><select className="form-select form-control-pro" value={pGroupId} onChange={e => setPGroupId(e.target.value)}><option value="">Select Group...</option>{clinicGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                   <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Full Name</label><input value={pName} onChange={e => setPName(e.target.value)} className="form-control form-control-pro" /></div>
                   <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Phone</label><input value={pPhone} onChange={e => setPPhone(e.target.value)} className="form-control form-control-pro" /></div>
                   <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Email Address (Optional)</label><input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} className="form-control form-control-pro" placeholder="patient@example.com" /></div>
                   <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Age</label><input type="number" value={pAge} onChange={e => setPAge(e.target.value)} className="form-control form-control-pro" /></div>
                   <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Gender</label><select className="form-select form-control-pro" value={pGender} onChange={e => setPGender(e.target.value)}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                </div>
                <div className="d-flex gap-2 mt-4"><button onClick={() => { setShowPatientModal(false); setShowEditModal(false); setEditingToken(null); }} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.7rem' }}>Cancel</button><button onClick={handleSavePatient} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase">{editingToken ? "Update Record" : "Confirm Check-in"}</button></div>
             </div>
          </div>
        </div>
      )}

      {showNotesModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '480px' }}>
             <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
               <div>
                  <h6 className="fw-black mb-0 text-uppercase tracking-tight text-teal-600">Consultation Notes</h6>
                  <p className="text-xxs fw-bold text-slate-400 text-uppercase tracking-widest mb-0">{showNotesModal.patientName} (Token: {showNotesModal.tokenInitial}-{showNotesModal.number})</p>
               </div>
               <button onClick={() => setShowNotesModal(null)} className="btn-close-round"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
             </div>
             <div className="p-4">
                <textarea className="form-control form-control-pro mb-4" rows={8} placeholder="Type symptoms, diagnosis or prescription notes here..." value={consultNotes} onChange={e => setConsultNotes(e.target.value)} style={{ fontSize: '0.85rem' }} />
                <div className="d-flex gap-2">
                  <button onClick={() => setShowNotesModal(null)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.7rem' }}>Discard</button>
                  <button onClick={handleSaveNotes} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{ backgroundColor: '#0d9488' }}>Save Notes</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: historyActiveNotes ? '1100px' : '850px', transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div className="px-4 pt-4 pb-2 d-flex justify-content-between align-items-center border-bottom">
              <h6 className="fw-extrabold mb-0 text-uppercase text-indigo-dark" style={{fontSize:'0.8rem'}}>Visit History: {showHistoryModal.name}</h6>
              <button onClick={() => { setShowHistoryModal(null); setHistoryActiveNotes(null); }} className="btn-close-round"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className={`animate-fade-in ${historyActiveNotes ? 'row g-4' : ''}`}>
                <div className={historyActiveNotes ? 'col-lg-7' : 'col-12'}>
                  <div className="card border-0 bg-slate-50 rounded-4 mb-4 overflow-hidden shadow-sm">
                    <div className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center cursor-pointer border-bottom" onClick={() => setIsHistoryFilterCollapsed(!isHistoryFilterCollapsed)}>
                      <span className="text-xxs fw-black text-slate-500 text-uppercase tracking-widest">Advanced Visit Search</span>
                      <span style={{ transform: isHistoryFilterCollapsed ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                    {!isHistoryFilterCollapsed && (
                      <div className="card-body p-3 bg-white">
                        <div className="row g-2">
                          <div className="col-md-3"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block">From</label><input type="date" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} className="form-control form-control-pro py-1" /></div>
                          <div className="col-md-3"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Till</label><input type="date" value={historyTill} onChange={e => setHistoryTill(e.target.value)} className="form-control form-control-pro py-1" /></div>
                          <div className="col-md-3"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Doctor</label><select value={historyDoctor} onChange={e => setHistoryDoctor(e.target.value)} className="form-select form-control-pro py-1"><option value="">Any</option>{state.users.filter(u => u.role === 'DOCTOR' && u.clinicId === clinicId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                          <div className="col-md-3"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Status</label><select value={historyStatus} onChange={e => setHistoryStatus(e.target.value)} className="form-select form-control-pro py-1"><option value="">Any</option><option value="WAITING">Waiting</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="NO_SHOW">No Show</option></select></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.7rem' }}>
                      <thead><tr className="bg-light"><th className="ps-2">Token #</th><th>Group</th><th>Doctor</th><th>Issued Date/Time</th><th className="text-center">Notes</th><th className="pe-2 text-center">Status</th></tr></thead>
                      <tbody>
                        {patientHistory.map(h => {
                          const group = state.groups.find(g => g.id === h.groupId);
                          const doctor = state.users.find(u => u.id === h.doctorId);
                          const isCurrentlyActive = historyActiveNotes?.id === h.id;
                          return (
                            <tr key={h.id} className={isCurrentlyActive ? 'bg-primary bg-opacity-5' : ''}>
                              <td className="ps-2 fw-black text-primary">{h.tokenInitial ? h.tokenInitial + '-' : ''}{h.number}</td>
                              <td><div className="text-xxs text-muted fw-bold truncate" style={{maxWidth: '120px'}}>{group?.name || '-'}</div></td>
                              <td><div className="text-xxs text-indigo-dark fw-bold truncate" style={{maxWidth: '120px'}}>{doctor?.name || '-'}</div></td>
                              <td>{formatDateTime(h.timestamp)}</td>
                              <td className="text-center">
                                <IconButton title="Inspect Visit Notes" onClick={() => setHistoryActiveNotes({ id: h.id, notes: h.patientData.notes || '' })} color={isCurrentlyActive ? 'primary' : 'teal'} className={isCurrentlyActive ? 'border border-primary' : ''}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </IconButton>
                              </td>
                              <td className="pe-2 text-center"><StatusBadge status={h.status} /></td>
                            </tr>
                          );
                        })}
                        {patientHistory.length === 0 && (<tr><td colSpan={6} className="text-center py-4 text-muted italic">No matching visits found.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
                {historyActiveNotes && (
                  <div className="col-lg-5 animate-slide-in">
                    <div className="card h-100 border-0 bg-light rounded-4 overflow-hidden shadow-sm">
                      <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                        <div><h6 className="text-xxs fw-black text-teal-600 text-uppercase tracking-widest mb-1">Clinical Observations</h6><div className="text-xs fw-bold text-slate-400">Visit Analysis</div></div>
                        <button onClick={() => setHistoryActiveNotes(null)} className="btn btn-sm btn-light rounded-pill px-3 py-1 fw-bold text-xxs border-0 shadow-none text-uppercase" style={{ fontSize: '0.6rem' }}>Hide</button>
                      </div>
                      <div className="card-body p-4 overflow-y-auto"><div className="text-slate-700 fw-medium lh-base whitespace-pre-wrap" style={{ fontSize: '0.85rem' }}>{historyActiveNotes.notes || "No specific consultation notes were recorded for this patient visit."}</div></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex gap-2 px-4 pb-4"><button onClick={() => { setShowHistoryModal(null); setHistoryActiveNotes(null); }} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{ fontSize: '0.65rem' }}>Close</button></div>
          </div>
        </div>
      )}

      {/* Fix broken showQuickIssueModal logic */}
      {showQuickIssueModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '380px' }}>
            <div className="px-4 pt-3 pb-2 d-flex justify-content-between align-items-center border-bottom">
              <h6 className="fw-extrabold mb-0 text-uppercase text-indigo-dark" style={{fontSize:'0.8rem'}}>Quick Issue Token</h6>
              <button onClick={() => { setShowQuickIssueModal(null); setIssuedToken(null); }} className="btn-close-round"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div className="p-3">
              {!issuedToken ? (
                <div className="animate-fade-in">
                  <div className="mb-3 text-center">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center fw-black mb-2" style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>{showQuickIssueModal.name.charAt(0)}</div>
                    <div className="h6 fw-black text-dark mb-0">{showQuickIssueModal.name}</div>
                    <div className="text-xxs fw-bold text-muted uppercase tracking-widest">{showQuickIssueModal.phone}</div>
                    <div className="mt-2 d-flex justify-content-center gap-2">
                       <span className="badge bg-white fw-bold border px-2 py-1.5 rounded-3" style={{ fontSize: '0.65rem', color: '#059669', borderColor: '#d1fae5' }}>Age: {showQuickIssueModal.age}</span>
                       <span className="badge bg-white fw-bold border px-2 py-1.5 rounded-3" style={{ fontSize: '0.65rem', color: '#059669', borderColor: '#d1fae5' }}>{showQuickIssueModal.gender}</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-xxs fw-black text-slate-500 mb-1.5 d-block text-uppercase tracking-widest">Select Consultation Wing</label>
                    <select className="form-select form-control-pro py-2" value={quickIssueGroupId} onChange={e => setQuickIssueGroupId(e.target.value)} style={{ fontSize: '0.8rem' }}>
                      <option value="">Choose a wing...</option>
                      {clinicGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.tokenInitial})</option>)}
                    </select>
                  </div>
                  
                  <div className="bg-success p-2 rounded-3 mb-1 shadow-sm">
                    <p className="text-xxs text-white fw-bold mb-0 text-center italic" style={{ fontSize: '0.6rem' }}>
                      Token will be instantly added to waitlist.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 animate-fade-in">
                  <div className="bg-success bg-opacity-10 text-success p-2 rounded-circle d-inline-flex mb-2 shadow-sm" style={{ width: '56px', height: '56px', alignItems: 'center', justifyContent: 'center' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <div className="h6 fw-black text-dark mb-1">Token Issued!</div>
                  <p className="text-muted small mb-0">Patient: <b>{issuedToken.patientName}</b></p>
                  <div className="mt-3">
                    <span className="badge bg-primary px-3 py-2 rounded-3 fw-black text-white shadow-sm" style={{ fontSize: '1.2rem' }}>
                      {issuedToken.tokenInitial}-{issuedToken.number}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="d-flex gap-2 px-3 pb-3">
              {!issuedToken ? (
                <>
                  <button onClick={() => setShowQuickIssueModal(null)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.65rem' }}>Cancel</button>
                  <button onClick={handleQuickIssue} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{ fontSize: '0.65rem' }}>Confirm</button>
                </>
              ) : (
                <button onClick={() => { setShowQuickIssueModal(null); setIssuedToken(null); }} className="btn btn-primary-pro w-100 fw-bold shadow-sm py-2.5 rounded-3 text-uppercase" style={{ fontSize: '0.75rem' }}>Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ensure confirm modals are correctly structurally included */}
      {showCancelConfirm && (<div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}><div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '400px' }}><div className="text-center py-5 px-4"><div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-flex mb-3">⚠️</div><h5 className="fw-black text-dark mb-1">Cancel Token?</h5><p className="text-muted small mb-4">Are you sure you want to cancel <b>{showCancelConfirm.name}</b>'s token?</p><div className="d-flex gap-2"><button onClick={() => setShowCancelConfirm(null)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase">Back</button><button onClick={executeCancel} className="btn btn-danger flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none">Yes, Cancel</button></div></div></div></div>)}
      {showDeleteConfirm && (<div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}><div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '400px' }}><div className="text-center py-5 px-4"><div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-flex mb-3">⚠️</div><h5 className="fw-black text-dark mb-1">Confirm Deletion</h5><p className="text-muted small mb-4">Permanently remove <b>{showDeleteConfirm.name}</b>'s token record?</p><div className="d-flex gap-2"><button onClick={() => setShowDeleteConfirm(null)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase">Cancel</button><button onClick={executeDelete} className="btn btn-danger flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none">Delete</button></div></div></div></div>)}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .hover-bg-slate:hover { background-color: #f1f5f9; }
        .cursor-pointer { cursor: pointer; }
        .table-pro thead th { background-color: #f8fafc; color: #64748b; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-top: none; }
        .table-pro tbody td { border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .transition-all { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-pulse { animation: pulse-custom 1s infinite; }
        @keyframes pulse-custom { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
        .scale-up { transform: scale(1.05); }
        .py-1.2 { padding-top: 0.3rem !important; padding-bottom: 0.3rem !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .whitespace-pre-wrap { white-space: pre-wrap; }
        .hover-shadow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-1px); }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="col-12 col-md-3">
    <div className="card border-0 shadow-sm p-3 rounded-4 bg-white h-100 d-flex align-items-center gap-3 flex-row transition-all hover-shadow">
       <div className={`bg-${color} bg-opacity-10 text-${color} rounded-3 d-flex align-items-center justify-content-center shadow-sm`} style={{width:'48px', height:'48px', flexShrink: 0, fontSize: '1.2rem'}}>{icon}</div>
       <div className="text-start flex-grow-1 overflow-hidden">
          <div className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-1" style={{fontSize: '0.6rem'}}>{title}</div>
          <div className="h3 fw-black mb-0 tracking-tighter text-dark lh-1" style={{ fontSize: '1.75rem' }}>{value}</div>
       </div>
    </div>
  </div>
);

export default DoctorDashboard;