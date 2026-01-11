import React, { useState, useEffect, useMemo } from 'react';
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

const AssistantDashboard: React.FC<Props> = ({ 
  state, user, onUpdateTokenStatus, onUpdateToken, onDeleteToken, onCreateToken, onAssignCabin, activeTab, onTabChange 
}) => {
  const clinicId = user.clinicId!;
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<{name: string, phone: string} | null>(null);
  const [showQuickIssueModal, setShowQuickIssueModal] = useState<{name: string, phone: string, age: string, gender: string, email: string} | null>(null);
  
  // Functional states
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [issuedToken, setIssuedToken] = useState<Token | null>(null);
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAge, setPAge] = useState('');
  const [pGender, setPGender] = useState('Male');
  const [pEmail, setPEmail] = useState('');
  const [pGroupId, setPGroupId] = useState('');
  const [quickIssueGroupId, setQuickIssueGroupId] = useState('');
  
  // Local logic states
  const [tick, setTick] = useState(0);
  const [callingTokenId, setCallingTokenId] = useState<string | null>(null);

  // Search & Sort states
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueSortConfig, setQueueSortConfig] = useState<{ key: QueueSortKey, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'asc' });
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSortConfig, setPatientSortConfig] = useState<{ key: PatientSortKey, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);

  // History filters
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTill, setHistoryTill] = useState('');
  const [historyDoctor, setHistoryDoctor] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [isHistoryFilterCollapsed, setIsHistoryFilterCollapsed] = useState(true);

  // Refresh clock
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const myGroups = state.groups.filter(g => g.assistantIds.includes(user.id));
  const [activeGroupId, setActiveGroupId] = useState(myGroups.length > 1 ? 'ALL' : (myGroups[0]?.id || ''));

  // Sync edit form
  useEffect(() => {
    if (editingToken) {
      setPName(editingToken.patientName); setPPhone(editingToken.patientData.phone || '');
      setPAge(editingToken.patientData.age || ''); setPGender(editingToken.patientData.gender || 'Male');
      setPEmail(editingToken.patientData.email || ''); setPGroupId(editingToken.groupId || '');
    } else {
      setPName(''); setPPhone(''); setPAge(''); setPGender('Male'); setPEmail(''); setPGroupId('');
    }
  }, [editingToken, showEditModal, showPatientModal]);

  const activeGroup = myGroups.find(g => g.id === activeGroupId);
  const activeGroupCabinIds = activeGroupId === 'ALL' 
    ? myGroups.flatMap(g => g.cabinIds) 
    : (activeGroup?.cabinIds || []);

  const cabinsInActiveGroup = state.cabins.filter(c => 
    c.clinicId === clinicId && 
    activeGroupCabinIds.includes(c.id)
  );

  // Logic helpers
  const clinicTokens = state.tokens.filter(t => t.clinicId === clinicId);
  const doctorsInClinic = state.users.filter(u => u.role === 'DOCTOR' && u.clinicId === clinicId);
  
  const filteredSortedQueue = useMemo(() => {
    let result = state.tokens.filter(t => 
      (activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId) && 
      (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')
    );
    const query = queueSearchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(t => t.patientName.toLowerCase().includes(query) || (t.patientData.phone || '').includes(query));
    }
    if (queueSortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        if (queueSortConfig.key === 'number') { valA = a.number; valB = b.number; }
        else if (queueSortConfig.key === 'patientName') { valA = a.patientName.toLowerCase(); valB = b.patientName.toLowerCase(); }
        else { valA = a.timestamp; valB = b.timestamp; }
        return queueSortConfig.direction === 'asc' ? (valA < valB ? -1 : 1) : (valA < valB ? 1 : -1);
      });
    }
    return result;
  }, [state.tokens, activeGroupId, myGroups, queueSearchQuery, queueSortConfig]);

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
        return patientSortConfig.direction === 'asc' ? (valA < valB ? -1 : 1) : (valA < valB ? 1 : -1);
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

  // Consultation Actions
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

  const handleNoShow = (tokenId: string) => onUpdateTokenStatus(tokenId, 'NO_SHOW');

  const handleSavePatient = () => {
    if (!pName) return;
    const patientData = { phone: pPhone, age: pAge, gender: pGender, email: pEmail };
    if (editingToken) onUpdateToken({ ...editingToken, patientName: pName, patientData, groupId: pGroupId || editingToken.groupId });
    else {
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

  const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
  const formatDateTime = (ts?: number) => ts ? new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';
  const getActiveTokenForCabin = (cabinId: string) => state.tokens.find(t => (t.status === 'CALLING' || t.status === 'CONSULTING') && t.cabinId === cabinId);

  const stats = {
    total: state.tokens.filter(t => activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId).filter(t => t.status !== 'CANCELLED' && t.status !== 'NO_SHOW').length,
    inQueue: waitingTokens.length,
    attended: state.tokens.filter(t => (activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId) && t.status === 'COMPLETED').length,
    noShow: state.tokens.filter(t => (activeGroupId === 'ALL' ? myGroups.some(mg => mg.id === t.groupId) : t.groupId === activeGroupId) && t.status === 'NO_SHOW').length
  };

  const completionRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  const nextTokensToDisplay = useMemo(() => {
    const getNextForGroup = (groupId: string) => state.tokens.filter(t => t.groupId === groupId && t.status === 'WAITING').sort((a, b) => a.timestamp - b.timestamp)[0];
    if (activeGroupId === 'ALL') return myGroups.map(g => ({ group: g, token: getNextForGroup(g.id) }));
    const g = myGroups.find(g => g.id === activeGroupId);
    return g ? [{ group: g, token: getNextForGroup(g.id) }] : [];
  }, [state.tokens, myGroups, activeGroupId]);

  const requestPatientSort = (key: PatientSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (patientSortConfig && patientSortConfig.key === key && patientSortConfig.direction === 'asc') direction = 'desc';
    setPatientSortConfig({ key, direction });
  };

  return (
    <div className="container-fluid p-0">
      <div className="row g-2 mb-3 mt-n2 animate-fade-in">
        <StatCard title="Total Tokens" value={stats.total} icon="👥" color="primary" />
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
                      <button onClick={() => setActiveGroupId('ALL')} className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${activeGroupId === 'ALL' ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover-bg-slate'}`} style={{ fontSize: '0.65rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}>All Groups</button>
                    )}
                    {myGroups.map(g => (
                      <button key={g.id} onClick={() => setActiveGroupId(g.id)} className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${activeGroupId === g.id ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover-bg-slate'}`} style={{ fontSize: '0.65rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap' }}>{g.name}</button>
                    ))}
                 </div>
               </div>
               <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h5 className="fw-black text-indigo-dark mb-1">Performance Details</h5>
                    <p className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-0">Context: {activeGroupId === 'ALL' ? 'All Assigned Wings' : activeGroup?.name}</p>
                  </div>
                  <div className="text-end">
                    <span className="h3 fw-black text-primary mb-0">{completionRate}%</span>
                    <p className="text-xxs fw-bold text-slate-400 text-uppercase tracking-widest mb-0">Efficiency</p>
                  </div>
               </div>
               <div className="mb-4"><div className="progress rounded-pill" style={{ height: '12px', backgroundColor: '#f1f5f9' }}><div className="progress-bar bg-primary rounded-pill transition-all" style={{ width: `${completionRate}%` }}></div></div></div>
               <div className="row g-3">
                 <div className="col-md-6"><div className="p-3 border rounded-4 bg-slate-50"><h6 className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-3">Monitoring Rooms</h6><div className="d-flex flex-wrap gap-2">{activeGroupCabinIds.length > 0 ? activeGroupCabinIds.slice(0,4).map(id => { const c = state.cabins.find(cab => cab.id === id); return <span key={id} className="badge bg-indigo-dark text-white px-3 py-2 rounded-3 fw-bold shadow-sm">{c?.name || 'Cabin'}</span> }) : <p className="text-muted small italic mb-0">No rooms monitored</p>}</div></div></div>
                 <div className="col-md-6"><div className="p-3 border rounded-4 bg-slate-50"><h6 className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-3">Queue Summary</h6><div className="d-flex justify-content-between align-items-center mb-1"><span className="small text-slate-600 fw-bold">Next Token:</span><span className="small fw-black text-primary">{unfilteredWaitingTokens[0] ? (unfilteredWaitingTokens[0].tokenInitial ? unfilteredWaitingTokens[0].tokenInitial + '-' : '') + unfilteredWaitingTokens[0].number : 'NONE'}</span></div><div className="d-flex justify-content-between align-items-center"><span className="small text-slate-600 fw-bold">Avg Wait:</span><span className="small fw-black text-dark">~12m</span></div></div></div>
               </div>
            </div>
          </div>
          <div className="col-lg-4"><div className="card border-0 shadow-sm rounded-4 bg-indigo-dark text-white p-4 h-100 overflow-hidden position-relative"><div className="position-relative z-1"><h5 className="fw-black mb-3">Support Console</h5><button onClick={() => onTabChange?.('consultation')} className="btn btn-light w-100 py-3 rounded-4 fw-black text-uppercase shadow-sm mb-3" style={{ fontSize: '0.75rem' }}>Open Room Console</button><div className="p-3 bg-white bg-opacity-10 rounded-4 border border-white border-opacity-10"><p className="small mb-2 fw-bold opacity-75">{user.name}</p><p className="text-xxs fw-black text-uppercase tracking-widest opacity-50 mb-0">Role: CLINIC ASSISTANT</p></div></div><div className="position-absolute bottom-0 end-0 p-3 opacity-10" style={{ fontSize: '8rem', transform: 'translate(20%, 20%)' }}>🩺</div></div></div>
        </div>
      )}

      {activeTab === 'consultation' && (
        <div className="row g-2 animate-fade-in">
          <div className="col-12 mb-1">
            <div className="d-flex gap-2 overflow-auto pb-1 align-items-center">
              <div className="d-flex gap-2 overflow-auto flex-grow-1 no-scrollbar">
                {myGroups.map(g => (
                  <button key={g.id} onClick={() => setActiveGroupId(g.id)} className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-none d-flex align-items-center gap-2 ${activeGroupId === g.id ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-400 hover-bg-slate'}`} style={{ fontSize: '0.68rem', padding: '0.4rem 1.05rem', whiteSpace: 'nowrap' }}>{g.name} <span className={`badge rounded-pill ${activeGroupId === g.id ? 'bg-white text-primary' : 'bg-light text-muted'}`}>{state.tokens.filter(t => t.groupId === g.id && (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW')).length}</span></button>
                ))}
              </div>
              <div className="bg-white border rounded-3 d-flex align-items-center gap-2 shadow-sm text-nowrap no-scrollbar overflow-x-auto px-3" style={{ fontSize: '0.68rem', padding: '0.4rem 0', border: '1px solid #e2e8f0', maxWidth: '40%' }}>
                <span className="fw-black text-slate-400 text-uppercase tracking-widest">Next:</span>
                <div className="d-flex gap-2 align-items-center">
                  {nextTokensToDisplay.length > 0 ? nextTokensToDisplay.map(({ group, token }, idx) => (
                    <React.Fragment key={group.id}>
                      {idx > 0 && <span className="text-slate-200 fw-light">|</span>}
                      <div className="d-flex align-items-center gap-1">
                        {activeGroupId === 'ALL' && <span className="text-xxs fw-bold text-slate-400">{group.tokenInitial}:</span>}
                        <span className="fw-black text-primary">{token ? `${token.tokenInitial ? token.tokenInitial + '-' : ''}${token.number}` : '--'}</span>
                      </div>
                    </React.Fragment>
                  )) : <span className="fw-black text-slate-300">--</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="row g-3">
              {cabinsInActiveGroup.map(cabin => {
                const activeToken = getActiveTokenForCabin(cabin.id);
                const doctor = state.users.find(u => u.id === cabin.currentDoctorId);
                let canNoShow = false;
                let secondsLeft = 0;
                if (activeToken?.status === 'CALLING' && activeToken.visitStartTime) {
                  const elapsed = (Date.now() - activeToken.visitStartTime) / 1000;
                  secondsLeft = Math.max(0, 30 - Math.floor(elapsed));
                  canNoShow = elapsed >= 30;
                }
                const isCurrentBeingCalled = activeToken && callingTokenId === activeToken.id;
                
                return (
                  <div className="col-12 col-md-6 col-lg-3" key={cabin.id}>
                    <div className="card border-0 shadow-sm rounded-4 bg-white text-center d-flex flex-column transition-all border-top border-4" style={{ minHeight: '240px', borderTopColor: doctor ? '#2563eb' : '#F0F4F8' }}>
                      <div className="py-2 px-3 border-bottom rounded-top-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#F0F4F8' }}>
                        <span className="fw-black text-slate-700 text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>{cabin.name}</span>
                        {doctor && <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-3 text-uppercase fw-black shadow-none border-0" style={{ fontSize: '0.6rem' }}>Dr. {doctor.name}</span>}
                      </div>
                      <div className="p-3 flex-grow-1 d-flex flex-column justify-content-center align-items-center position-relative">
                        {doctor ? (activeToken ? (
                            <div className="animate-fade-in w-100 h-100 d-flex flex-column justify-content-center align-items-center">
                              <div className="position-absolute top-0 start-0 p-1">
                                <button onClick={() => handleRepeatCall(activeToken.id)} className={`btn btn-outline-primary px-1.5 py-1 rounded-3 text-uppercase fw-black shadow-none border-2 transition-all ${isCurrentBeingCalled ? 'animate-pulse bg-primary text-white border-primary' : ''}`} style={{ fontSize: '0.55rem' }}>
                                  {isCurrentBeingCalled ? '📢 CALL' : 'Repeat 📢'}
                                </button>
                              </div>
                              <div className={`badge ${activeToken.status === 'CALLING' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-success bg-opacity-10 text-success'} px-2 py-0.5 rounded-pill fw-black text-uppercase tracking-widest mb-1`} style={{ fontSize: '0.55rem' }}>
                                {activeToken.status === 'CALLING' ? 'Calling' : 'Consulting'}
                              </div>
                              <div className="mb-1">
                                <span className={`badge bg-primary px-2 py-0.5 rounded-2 fw-black text-white shadow-sm transition-all ${isCurrentBeingCalled ? 'scale-up' : ''}`} style={{ fontSize: '0.9rem' }}>
                                  {activeToken.tokenInitial}-{activeToken.number}
                                </span>
                              </div>
                              <div className="h6 fw-black text-indigo-dark text-truncate mb-0" style={{ maxWidth: '85%' }}>{activeToken.patientName}</div>
                              <div className="mb-3"><p className="fw-black text-slate-500 text-uppercase tracking-widest mb-0" style={{ fontSize: '0.65rem' }}>{activeToken.patientData.age}Y • {activeToken.patientData.gender}</p></div>
                              
                              <div className="container-fluid px-1 mt-2">
                                <div className="row g-2">
                                  {activeToken.status === 'CALLING' ? (
                                    <div className="col-12">
                                      <button onClick={() => handleNoShow(activeToken.id)} disabled={!canNoShow} className={`btn w-100 py-2 rounded-3 text-uppercase fw-black shadow-none border-2 transition-all ${canNoShow ? 'bg-danger text-white border-danger' : 'text-danger border-danger'}`} style={{ fontSize: '0.65rem' }}>
                                        {canNoShow ? 'Mark No Show' : `Wait ${secondsLeft}s to Skip`}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="col-12">
                                      <div className="p-2 bg-light rounded-3 text-xxs fw-bold text-slate-500 text-uppercase tracking-widest border border-slate-100">Consultation In Progress</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-1 w-100 animate-fade-in">
                              <div className="h4 mb-2 opacity-25">⏳</div>
                              <h6 className="fw-black text-slate-400 text-uppercase tracking-widest mb-2" style={{ fontSize: '0.7rem' }}>Station Ready</h6>
                              <button onClick={() => handleCallNext(cabin.id)} disabled={unfilteredWaitingTokens.length === 0} className="btn btn-primary-pro w-100 py-2 rounded-3 text-uppercase fw-black shadow-lg" style={{ fontSize: '0.7rem' }}>
                                {unfilteredWaitingTokens.length > 0 ? `Call Next Patient` : 'Queue Empty'}
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="opacity-50 py-1">
                            <div className="h3 mb-1 text-slate-300">🔒</div>
                            <p className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-0">Station Offline</p>
                            <p className="text-xxs text-slate-300 italic mt-1">Waiting for doctor assignment</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white animate-fade-in">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="fw-extrabold text-dark mb-0" style={{ fontSize: '0.9rem' }}>Live Queue</h5>
            <div className="d-flex gap-2">
              <input type="text" value={queueSearchQuery} onChange={e => setQueueSearchQuery(e.target.value)} placeholder="Search..." className="form-control form-control-pro py-1.5 fw-bold" style={{ fontSize: '0.7rem', width: '200px' }} />
              <button className="btn btn-primary-pro" onClick={() => { setEditingToken(null); setPGroupId(activeGroupId === 'ALL' ? '' : activeGroupId); setShowPatientModal(true); }}>Manual Entry</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr className="bg-light text-slate-500">
                  <th style={{ width: '40px' }}></th>
                  <th>No.</th>
                  <th>Patient</th>
                  <th>Issued</th>
                  <th>Wait</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSortedQueue.map(t => (
                  <tr key={t.id}>
                    <td className="text-center"><button onClick={() => setExpandedTokenId(expandedTokenId === t.id ? null : t.id)} className="btn btn-sm p-0 text-slate-400 border-0 shadow-none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: expandedTokenId === t.id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><polyline points="9 18 15 12 9 6"></polyline></svg></button></td>
                    <td className="fw-black text-primary">{t.tokenInitial ? t.tokenInitial + '-' : ''}{t.number}</td>
                    <td className="fw-bold text-dark">{t.patientName}</td>
                    <td>{formatTime(t.timestamp)}</td>
                    <td><WaitTimeBadge minutes={Math.floor((Date.now() - t.timestamp) / 60000)} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-center"><IconButton onClick={() => { setEditingToken(t); setShowEditModal(true); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    <span className="position-absolute top-0 start-0 translate-middle-y ms-2 text-slate-400" style={{ fontSize: '0.7rem' }}>🔍</span>
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

      {/* MODALS */}
      {(showPatientModal || showEditModal) && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '480px' }}>
             <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
               <h6 className="fw-black mb-0 text-uppercase text-indigo-dark">{editingToken ? "Update Patient" : "New Patient"}</h6>
               <button onClick={() => { setShowPatientModal(false); setShowEditModal(false); setEditingToken(null); }} className="btn-close-round"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
             </div>
             <div className="p-4">
                <div className="row g-3">
                   <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Target Wing</label><select className="form-select form-control-pro" value={pGroupId} onChange={e => setPGroupId(e.target.value)}><option value="">Select Wing...</option>{myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                   <div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Full Name</label><input value={pName} onChange={e => setPName(e.target.value)} className="form-control form-control-pro" /></div>
                   <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Phone</label><input value={pPhone} onChange={e => setPPhone(e.target.value)} className="form-control form-control-pro" /></div>
                   <div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Age</label><input type="number" value={pAge} onChange={e => setPAge(e.target.value)} className="form-control form-control-pro" /></div>
                </div>
                <div className="d-flex gap-2 mt-4"><button onClick={() => { setShowPatientModal(false); setShowEditModal(false); setEditingToken(null); }} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none">Cancel</button><button onClick={handleSavePatient} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase">Save Patient</button></div>
             </div>
          </div>
        </div>
      )}

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
                      {state.groups.filter(g => g.clinicId === clinicId).map(g => <option key={g.id} value={g.id}>{g.name} ({g.tokenInitial})</option>)}
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
                  <div className="bg-success bg-opacity-10 text-success p-2 rounded-circle d-inline-flex mb-2 shadow-sm" style={{ width: '56px', height: '56px', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
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

      {showHistoryModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '850px', transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div className="px-4 pt-4 pb-2 d-flex justify-content-between align-items-center border-bottom">
              <h6 className="fw-extrabold mb-0 text-uppercase text-indigo-dark" style={{fontSize:'0.8rem'}}>Visit History: {showHistoryModal.name}</h6>
              <button onClick={() => { setShowHistoryModal(null); }} className="btn-close-round"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="animate-fade-in">
                <div className="col-12">
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
                          <div className="col-md-3"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Doctor</label><select value={historyDoctor} onChange={e => setHistoryDoctor(e.target.value)} className="form-select form-control-pro py-1"><option value="">Any</option>{doctorsInClinic.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                          <div className="col-md-3"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Status</label><select value={historyStatus} onChange={e => setHistoryStatus(e.target.value)} className="form-select form-control-pro py-1"><option value="">Any</option><option value="WAITING">Waiting</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="NO_SHOW">No Show</option></select></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.7rem' }}>
                      <thead><tr className="bg-light sticky-top" style={{ zIndex: 10 }}><th className="ps-2">Token #</th><th>Group</th><th>Doctor</th><th>Issued Date/Time</th><th className="pe-2 text-center">Status</th></tr></thead>
                      <tbody>
                        {patientHistory.map(h => {
                          const group = state.groups.find(g => g.id === h.groupId);
                          const doctor = state.users.find(u => u.id === h.doctorId);
                          return (
                            <tr key={h.id}>
                              <td className="ps-2 fw-black text-primary">{h.tokenInitial ? h.tokenInitial + '-' : ''}{h.number}</td>
                              <td><div className="text-xxs text-muted fw-bold truncate" style={{maxWidth: '120px'}}>{group?.name || '-'}</div></td>
                              <td><div className="text-xxs text-indigo-dark fw-bold truncate" style={{maxWidth: '120px'}}>{doctor?.name || '-'}</div></td>
                              <td>{formatDateTime(h.timestamp)}</td>
                              <td className="pe-2 text-center"><StatusBadge status={h.status} /></td>
                            </tr>
                          );
                        })}
                        {patientHistory.length === 0 && (<tr><td colSpan={5} className="text-center py-4 text-muted italic">No matching visits found.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 px-4 pb-4"><button onClick={() => { setShowHistoryModal(null); }} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{ fontSize: '0.65rem' }}>Close History Explorer</button></div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .hover-bg-slate:hover { background-color: #f1f5f9; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .table-pro thead th { background-color: #f8fafc; color: #64748b; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; border-top: none; }
        .table-pro tbody td { border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .hover-shadow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .animate-pulse { animation: pulse-custom 1s infinite; }
        @keyframes pulse-custom { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
        .scale-up { transform: scale(1.05); }
        .whitespace-pre-wrap { white-space: pre-wrap; }
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

const WaitTimeBadge = ({ minutes }: { minutes: number }) => {
  const getWaitTimeClasses = (min: number) => {
    if (min >= 45) return 'bg-danger bg-opacity-10 text-danger';
    if (min >= 30) return 'bg-warning bg-opacity-10 text-warning';
    if (min >= 15) return 'bg-primary bg-opacity-10 text-primary';
    return 'bg-success bg-opacity-10 text-success';
  };
  return <span className={`badge rounded-pill ${getWaitTimeClasses(minutes)} fw-bold text-xxs`} style={{ minWidth: '45px' }}>{minutes}m</span>;
};

const StatusBadge = ({ status }: { status: Token['status'] }) => {
  const styles: Record<Token['status'], React.CSSProperties> = {
    WAITING: { color: '#2563eb', background: '#eff6ff' },
    CALLING: { color: '#d97706', background: '#fffbeb' },
    CONSULTING: { color: '#4f46e5', background: '#eef2ff' },
    COMPLETED: { color: '#059669', background: '#ecfdf5' },
    CANCELLED: { color: '#dc2626', background: '#fef2f2' },
    NO_SHOW: { color: '#ea580c', background: '#fff7ed' }
  };
  return <span className="badge rounded-pill px-2 py-1 fw-bold text-xxs text-uppercase" style={{ ...styles[status], minWidth: '70px', textAlign: 'center' }}>{status.replace('_', ' ')}</span>;
};

const IconButton = ({ children, onClick, className, color = 'slate-600' }: any) => (
  <button className={`btn btn-sm btn-light d-flex align-items-center justify-content-center rounded-circle text-${color} ${className}`} onClick={onClick} style={{ width: '32px', height: '32px', padding: '0' }}>{children}</button>
);

export default AssistantDashboard;