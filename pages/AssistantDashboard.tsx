import React, { useState, useEffect, useMemo } from 'react';
import { AppState, User, Token, Cabin, ClinicGroup } from '../types';

interface Props {
  state: AppState;
  user: User;
  onUpdateTokenStatus: (id: string, status: Token['status'], cabinId?: string) => void;
  onUpdateToken: (t: Token) => void;
  onDeleteToken: (id: string) => void;
  onCreateToken: (name: string, data: Record<string, string>, clinicId: string, formId?: string) => Promise<Token>;
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

  const handleSavePatient = async () => {
    if (!pName) return;
    const patientData = { phone: pPhone, age: pAge, gender: pGender, email: pEmail };
    if (editingToken) onUpdateToken({ ...editingToken, patientName: pName, patientData, groupId: pGroupId || editingToken.groupId });
    else {
      const group = state.groups.find(g => g.id === pGroupId);
      if (group) await onCreateToken(pName, patientData, clinicId, group.formId);
    }
    setShowEditModal(false); setShowPatientModal(false); setEditingToken(null);
  };

  const handleQuickIssue = async () => {
    if (!showQuickIssueModal || !quickIssueGroupId) return;
    const group = state.groups.find(g => g.id === quickIssueGroupId);
    if (!group) return;
    const patientData = { phone: showQuickIssueModal.phone, age: showQuickIssueModal.age, gender: showQuickIssueModal.gender, email: showQuickIssueModal.email };
    const newToken = await onCreateToken(showQuickIssueModal.name, patientData, clinicId, group.formId);
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
              <input type="text" value={queueSearchQuery} onChange={e => setQueueSearchQuery(e.target.value)} placeholder="Search..." className="form-control form-control-pro py-1.5 fw-bold" style={{ fontSize: '0.7rem' }} />
              <button className="btn btn-primary-pro text-nowrap" onClick={() => { setEditingToken(null); setPGroupId(activeGroupId === 'ALL' ? '' : activeGroupId); setShowPatientModal(true); }}>Manual Entry</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
               <thead><tr className="bg-light text-slate-500 uppercase"><th style={{width:'40px'}}></th><th>No.</th><th>Patient</th><th>Issued</th><th>Wait</th><th>Status</th><th className="text-center">Actions</th></tr></thead>
               <tbody>
                  {filteredSortedQueue.map(t => {
                    const isExpanded = expandedTokenId === t.id;
                    const waitMin = Math.floor((Date.now() - t.timestamp) / 60000);
                    return (
                      <React.Fragment key={t.id}>
                        <tr className={isExpanded ? 'bg-light' : ''}>
                          <td className="text-center"><button className="btn btn-sm p-0 text-slate-400" onClick={() => setExpandedTokenId(isExpanded ? null : t.id)}>{isExpanded ? '▼' : '▶'}</button></td>
                          <td className="fw-black text-primary">{t.tokenInitial}-{t.number}</td>
                          <td className="fw-bold text-dark">{t.patientName}</td>
                          <td>{formatTime(t.timestamp)}</td>
                          <td><span className={`badge rounded-pill fw-bold text-xxs ${waitMin > 30 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}`}>{waitMin}m</span></td>
                          <td><StatusBadge status={t.status} /></td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                              <IconButton onClick={() => { setEditingToken(t); setShowEditModal(true); }}>📝</IconButton>
                              <IconButton color="danger" onClick={() => onDeleteToken(t.id)}>🗑️</IconButton>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-white border-bottom animate-fade-in"><td colSpan={7} className="p-3"><div className="row g-3"><div className="col-md-3 small"><b>Age:</b> {t.patientData.age}</div><div className="col-md-3 small"><b>Phone:</b> {t.patientData.phone}</div><div className="col-md-3 small"><b>Gender:</b> {t.patientData.gender}</div></div></td></tr>
                        )}
                      </React.Fragment>
                    );
                  })}
               </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white animate-fade-in">
           <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-extrabold text-dark mb-0" style={{ fontSize: '0.9rem' }}>Patients Register</h5>
              <input type="text" value={patientSearchQuery} onChange={e => setPatientSearchQuery(e.target.value)} placeholder="Global search..." className="form-control form-control-pro py-1.5 fw-bold" style={{ fontSize: '0.7rem', width: '200px' }} />
           </div>
           <div className="table-responsive">
              <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                 <thead><tr className="bg-light text-slate-500 uppercase"><th className="ps-4 cursor-pointer" onClick={() => requestPatientSort('name')}>Patient Name</th><th className="cursor-pointer" onClick={() => requestPatientSort('age')}>Age</th><th className="cursor-pointer" onClick={() => requestPatientSort('phone')}>Mobile</th><th className="text-center">Quick Token</th><th className="text-center">History</th></tr></thead>
                 <tbody>
                    {uniquePatients.map((p, idx) => (
                      <tr key={idx}>
                        <td className="ps-4 fw-bold">{p.name}</td>
                        <td>{p.age}Y</td>
                        <td className="fw-medium text-slate-600">{p.phone}</td>
                        <td className="text-center"><button onClick={() => setShowQuickIssueModal(p)} className="btn btn-primary-pro py-1 px-3" style={{fontSize: '0.65rem'}}>Issue</button></td>
                        <td className="text-center"><button onClick={() => setShowHistoryModal(p)} className="btn btn-light py-1 px-3 border fw-bold" style={{fontSize: '0.65rem'}}>View</button></td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Modals for Patient Entry, Quick Issue, etc */}
      {showPatientModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 p-4 animate-fade-in" style={{ maxWidth: '400px' }}>
             <h5 className="fw-black mb-4">Check-in Patient</h5>
             <div className="mb-3"><label className="text-xxs fw-bold uppercase mb-1 d-block">Wing</label><select className="form-select form-control-pro" value={pGroupId} onChange={e => setPGroupId(e.target.value)}><option value="">Select...</option>{myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
             <div className="mb-3"><label className="text-xxs fw-bold uppercase mb-1 d-block">Name</label><input value={pName} onChange={e => setPName(e.target.value)} className="form-control form-control-pro" /></div>
             <div className="mb-3"><label className="text-xxs fw-bold uppercase mb-1 d-block">Phone</label><input value={pPhone} onChange={e => setPPhone(e.target.value)} className="form-control form-control-pro" /></div>
             <div className="row g-3 mb-4">
                <div className="col-6"><label className="text-xxs fw-bold uppercase mb-1 d-block">Age</label><input type="number" value={pAge} onChange={e => setPAge(e.target.value)} className="form-control form-control-pro" /></div>
                <div className="col-6"><label className="text-xxs fw-bold uppercase mb-1 d-block">Gender</label><select value={pGender} onChange={e => setPGender(e.target.value)} className="form-select form-control-pro"><option value="Male">Male</option><option value="Female">Female</option></select></div>
             </div>
             <div className="d-flex gap-2"><button onClick={() => setShowPatientModal(false)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase" style={{fontSize:'0.65rem'}}>Cancel</button><button onClick={handleSavePatient} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{fontSize:'0.65rem'}}>Confirm</button></div>
          </div>
        </div>
      )}

      {showQuickIssueModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 p-4 animate-fade-in" style={{ maxWidth: '380px' }}>
            <h6 className="fw-black mb-1 uppercase tracking-widest text-primary">Quick Token</h6>
            <h4 className="fw-black mb-3">{showQuickIssueModal.name}</h4>
            {!issuedToken ? (
              <>
                <div className="mb-4"><label className="text-xxs fw-black text-slate-500 uppercase mb-1.5 d-block">Select Consultation Wing</label><select className="form-select form-control-pro py-2" value={quickIssueGroupId} onChange={e => setQuickIssueGroupId(e.target.value)} style={{ fontSize: '0.8rem' }}><option value="">Choose...</option>{myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                <div className="d-flex gap-2"><button onClick={() => setShowQuickIssueModal(null)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase" style={{fontSize:'0.65rem'}}>Cancel</button><button onClick={handleQuickIssue} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{fontSize:'0.65rem'}}>Generate</button></div>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="h1 mb-1 fw-black text-primary">{issuedToken.tokenInitial}-{issuedToken.number}</div>
                <p className="small text-muted mb-4">Token added to waitlist.</p>
                <button onClick={() => { setShowQuickIssueModal(null); setIssuedToken(null); }} className="btn btn-primary-pro w-100 fw-bold py-2.5 rounded-3 text-uppercase">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .table-pro thead th { background-color: #f8fafc; color: #64748b; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-top: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-pulse { animation: pulse 1s infinite alternate; }
        @keyframes pulse { from { opacity: 1; } to { opacity: 0.7; } }
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

const IconButton = ({ children, onClick, color = 'slate-600' }: any) => (
  <button className={`btn btn-sm btn-light rounded-circle text-${color}`} onClick={onClick} style={{ width: '32px', height: '32px', padding: '0' }}>{children}</button>
);

const StatusBadge = ({ status }: { status: Token['status'] }) => {
  const styles: any = {
    WAITING: { color: '#2563eb', background: '#eff6ff' },
    CALLING: { color: '#d97706', background: '#fffbeb' },
    CONSULTING: { color: '#4f46e5', background: '#eef2ff' },
  };
  const s = styles[status] || { color: '#64748b', background: '#f8fafc' };
  return <span className="badge rounded-pill px-2 py-1 fw-bold text-xxs text-uppercase" style={{ ...s, border: `1px solid ${s.color}20` }}>{status}</span>;
};

export default AssistantDashboard;