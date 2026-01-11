import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const DoctorDashboard: React.FC<Props> = ({ 
  state, user, onUpdateTokenStatus, onUpdateToken, onDeleteToken, onCreateToken, onAssignCabin, activeTab, onTabChange 
}) => {
  const clinicId = user.clinicId!;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<{name: string, phone: string} | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<Token | null>(null);
  const [consultNotes, setConsultNotes] = useState('');
  const [callingTokenId, setCallingTokenId] = useState<string | null>(null);

  const myGroups = state.groups.filter(g => g.doctorIds.includes(user.id));
  const [activeGroupId, setActiveGroupId] = useState(myGroups.length > 1 ? 'ALL' : (myGroups[0]?.id || ''));

  const cabinsInActiveGroup = state.cabins.filter(c => {
    const relevantCabinIds = activeGroupId === 'ALL' ? myGroups.flatMap(g => g.cabinIds) : myGroups.find(g => g.id === activeGroupId)?.cabinIds || [];
    return relevantCabinIds.includes(c.id);
  });

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

  const getActiveTokenForCabin = (cabinId: string) => state.tokens.find(t => (t.status === 'CALLING' || t.status === 'CONSULTING') && t.cabinId === cabinId);

  return (
    <div className="container-fluid p-0 animate-fade-in">
      <div className="row g-3 mb-4">
        {cabinsInActiveGroup.map(cabin => {
          const isMine = cabin.currentDoctorId === user.id;
          const isVacant = !cabin.currentDoctorId;
          const activeToken = getActiveTokenForCabin(cabin.id);
          
          return (
            <div className="col-12 col-md-6 col-lg-3" key={cabin.id}>
              <div className={`card border-0 shadow-sm rounded-4 bg-white text-center p-3 border-top border-4 ${isMine ? 'border-primary' : 'border-light'}`}>
                <div className="d-flex justify-content-between mb-3 align-items-center">
                   <span className="fw-black text-slate-500 uppercase small">{cabin.name}</span>
                   {isVacant && <button className="btn btn-sm btn-success" onClick={() => onAssignCabin(cabin.id, user.id)}>Login</button>}
                   {isMine && <button className="btn btn-sm btn-danger" onClick={() => onAssignCabin(cabin.id, undefined)}>Logout</button>}
                </div>

                {isMine ? (
                  activeToken ? (
                    <div className="py-2">
                       <div className="badge bg-warning bg-opacity-10 text-warning uppercase mb-2">{activeToken.status}</div>
                       <div className="h2 fw-black text-primary mb-1">{activeToken.tokenInitial}-{activeToken.number}</div>
                       <div className="h5 fw-bold text-dark mb-4">{activeToken.patientName}</div>
                       <div className="d-flex gap-2">
                          <button className="btn btn-primary flex-grow-1" onClick={() => onUpdateTokenStatus(activeToken.id, 'CONSULTING')}>Start</button>
                          <button className="btn btn-success flex-grow-1" onClick={() => onUpdateTokenStatus(activeToken.id, 'COMPLETED')}>End</button>
                       </div>
                    </div>
                  ) : (
                    <div className="py-4">
                       <button className="btn btn-primary-pro w-100 py-3" disabled={unfilteredWaitingTokens.length === 0} onClick={() => handleCallNext(cabin.id)}>
                          Call Next Patient
                       </button>
                       <p className="text-muted small mt-2">{unfilteredWaitingTokens.length} in queue</p>
                    </div>
                  )
                ) : (
                  <div className="py-4 opacity-50"><span className="h4">🔒</span><p className="small mt-2">Station Locked</p></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorDashboard;