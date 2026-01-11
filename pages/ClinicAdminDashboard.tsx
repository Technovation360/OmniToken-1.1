import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, User, Cabin, RegistrationForm, ClinicGroup, Role, Token, Clinic } from '../types';
import { FIELD_OPTIONS } from '../constants';

interface Props {
  state: AppState;
  user: User;
  onAddCabin: (c: Cabin) => void;
  onUpdateCabin: (c: Cabin) => void;
  onDeleteCabin: (id: string) => void;
  onAddForm: (f: RegistrationForm) => void;
  onUpdateForm: (f: RegistrationForm) => void;
  onDeleteForm: (id: string) => void;
  onAddGroup: (g: ClinicGroup) => void;
  onUpdateGroup: (g: ClinicGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (u: User) => void;
  onUpdateToken: (t: Token) => void;
  onUpdateTokenStatus: (tokenId: string, status: Token['status'], cabinId?: string) => void;
  onDeleteToken: (id: string) => void;
  onUpdateClinic: (c: Clinic) => void;
  onCreateToken: (name: string, data: Record<string, string>, clinicId: string, formId?: string) => Promise<Token>;
  onPreviewForm: (formId: string, clinicId: string) => void;
  activeTab: 'insights' | 'queue' | 'cabins' | 'groups' | 'users' | 'patients' | 'settings';
  onTabChange: (tab: 'insights' | 'queue' | 'cabins' | 'groups' | 'users' | 'patients' | 'settings') => void;
}

type PatientSortKey = 'name' | 'age' | 'gender' | 'phone' | 'email';
type QueueSortKey = 'number' | 'patientName' | 'group' | 'timestamp' | 'wait' | 'status';

const ClinicAdminDashboard: React.FC<Props> = ({ 
  state, user, onAddCabin, onUpdateCabin, onDeleteCabin, onAddGroup, onUpdateGroup, onDeleteGroup, onAddUser, onDeleteUser, onUpdateUser, onUpdateToken, onUpdateTokenStatus, onDeleteToken, onUpdateClinic, onCreateToken, onPreviewForm, activeTab, onTabChange 
}) => {
  const clinicId = user.clinicId!;
  const currentClinic = state.clinics.find(c => c.id === clinicId)!;
  
  // Modal visibility states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCabinModal, setShowCabinModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<RegistrationForm | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, type: 'CABIN' | 'GROUP' | 'USER' | 'TOKEN', name: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<{ id: string, name: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<{name: string, phone: string} | null>(null);
  const [showQuickIssueModal, setShowQuickIssueModal] = useState<{name: string, phone: string, age: string, gender: string, email: string} | null>(null);
  const [issuedToken, setIssuedToken] = useState<Token | null>(null);
  const [historyActiveNotes, setHistoryActiveNotes] = useState<{id: string, notes: string} | null>(null);
  
  // Filtering and Sorting
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSortConfig, setPatientSortConfig] = useState<{ key: PatientSortKey, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueSortConfig, setQueueSortConfig] = useState<{ key: QueueSortKey, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'asc' });
  
  // Single token expansion state for queue
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedQueueGroupId, setSelectedQueueGroupId] = useState<string>('ALL');
  const [quickIssueGroupId, setQuickIssueGroupId] = useState('');

  // Editing targets
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [editingGroup, setEditingGroup] = useState<ClinicGroup | null>(null);
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null);
  const [editingToken, setEditingToken] = useState<Token | null>(null);

  // Profile management states
  const [profileName, setProfileName] = useState(currentClinic.name);
  const [profilePhone, setProfilePhone] = useState(currentClinic.phone);
  const [profileEmail, setProfileEmail] = useState(currentClinic.email);
  const [profileAddress, setProfileAddress] = useState(currentClinic.address);
  const [profileCity, setProfileCity] = useState(currentClinic.city);
  const [profileState, setProfileState] = useState(currentClinic.state);
  const [profilePincode, setProfilePincode] = useState(currentClinic.pincode);
  const [profileLogo, setProfileLogo] = useState(currentClinic.logo || '');
  const [profileSpecialties, setProfileSpecialties] = useState<string[]>(currentClinic.specialties || []);

  // Staff management states
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userSpecialty, setUserSpecialty] = useState('');
  const [userRole, setUserRole] = useState<Role>('DOCTOR');
  const [userPassword, setUserPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Group management states
  const [groupNameInput, setGroupNameInput] = useState('');
  const [tokenInitialInput, setTokenInitialInput] = useState('');
  const [formTitleInput, setFormTitleInput] = useState('');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [selectedCabins, setSelectedCabins] = useState<string[]>([]);

  // Patient entry states
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAge, setPAge] = useState('');
  const [pGender, setPGender] = useState('Male');
  const [pEmail, setPEmail] = useState('');
  const [pGroupId, setPGroupId] = useState('');

  const clinicUsers = state.users.filter(u => u.clinicId === clinicId && u.id !== user.id);
  const clinicCabins = state.cabins.filter(c => c.clinicId === clinicId);
  const clinicGroups = state.groups.filter(g => g.clinicId === clinicId);
  const clinicTokens = state.tokens.filter(t => t.clinicId === clinicId);
  
  const handleSaveUser = () => {
    if (!userName || !userEmail) return;
    const uData: User = { 
      id: editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9), 
      name: userName, email: userEmail, phone: userPhone, specialty: userSpecialty,
      password: userPassword || 'password', role: userRole, clinicId 
    };
    editingUser ? onUpdateUser(uData) : onAddUser(uData);
    setShowUserModal(false);
  };

  const handleSaveGroup = () => {
    if (!groupNameInput) return;
    const gData: ClinicGroup = { 
      id: editingGroup ? editingGroup.id : Math.random().toString(36).substr(2, 9), 
      name: groupNameInput, tokenInitial: tokenInitialInput.toUpperCase(), formTitle: formTitleInput,
      clinicId, doctorIds: selectedDoctors, assistantIds: selectedAssistants, 
      screenIds: selectedScreens, cabinIds: selectedCabins, formId: editingGroup?.formId
    };
    editingGroup ? onUpdateGroup(gData) : onAddGroup(gData);
    setShowGroupModal(false);
  };

  const handleSavePatient = async () => {
    if (!pName || !pGroupId) return;
    const data = { phone: pPhone, age: pAge, gender: pGender, email: pEmail };
    const group = state.groups.find(g => g.id === pGroupId);
    if (group) {
        await onCreateToken(pName, data, clinicId, group.formId);
        setShowPatientModal(false);
    }
  };

  const handleQuickIssue = async () => {
    if (!showQuickIssueModal || !quickIssueGroupId) return;
    const group = state.groups.find(g => g.id === quickIssueGroupId);
    if (group) {
      const data = { phone: showQuickIssueModal.phone, age: showQuickIssueModal.age, gender: showQuickIssueModal.gender, email: showQuickIssueModal.email };
      const newToken = await onCreateToken(showQuickIssueModal.name, data, clinicId, group.formId);
      setIssuedToken(newToken);
    }
  };

  const filteredSortedQueue = useMemo(() => {
    let result = clinicTokens.filter(t => (selectedQueueGroupId === 'ALL' || t.groupId === selectedQueueGroupId) && (t.status !== 'COMPLETED' && t.status !== 'CANCELLED'));
    if (queueSearchQuery) result = result.filter(t => t.patientName.toLowerCase().includes(queueSearchQuery.toLowerCase()));
    return result.sort((a,b) => a.timestamp - b.timestamp);
  }, [clinicTokens, selectedQueueGroupId, queueSearchQuery]);

  const uniquePatients = useMemo(() => {
    const map = new Map<string, any>();
    clinicTokens.forEach(t => {
      const key = `${t.patientName}-${t.patientData.phone}`;
      if (!map.has(key)) map.set(key, { ...t.patientData, name: t.patientName });
    });
    let result = Array.from(map.values());
    if (patientSearchQuery) result = result.filter(p => p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()));
    return result;
  }, [clinicTokens, patientSearchQuery]);

  const StatusBadge = ({ status }: { status: Token['status'] }) => (
    <span className={`badge rounded-pill px-2 py-1 text-xxs fw-bold uppercase ${status === 'WAITING' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-warning bg-opacity-10 text-warning'}`}>
      {status}
    </span>
  );

  return (
    <div className="container-fluid px-0 animate-fade-in">
      <div className="row g-2 mb-3">
         <div className="col-12 col-md-4"><div className="p-3 bg-white rounded-4 shadow-sm"><h6>Patients Waiting</h6><div className="h3 fw-black">{filteredSortedQueue.length}</div></div></div>
         <div className="col-12 col-md-4"><div className="p-3 bg-white rounded-4 shadow-sm"><h6>Rooms Occupied</h6><div className="h3 fw-black">{clinicCabins.filter(c => c.currentDoctorId).length}</div></div></div>
         <div className="col-12 col-md-4"><div className="p-3 bg-white rounded-4 shadow-sm"><h6>Active Groups</h6><div className="h3 fw-black">{clinicGroups.length}</div></div></div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
           <h5 className="mb-0 fw-extrabold text-dark">Live Console</h5>
           <div className="d-flex gap-2">
             <button className="btn btn-primary-pro" onClick={() => setShowPatientModal(true)}>Manual Check-in</button>
           </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.8rem' }}>
            <thead><tr className="bg-light"><th>Token</th><th>Patient</th><th>Status</th><th className="text-center">Action</th></tr></thead>
            <tbody>
              {filteredSortedQueue.map(t => (
                <tr key={t.id}>
                  <td className="fw-black text-primary">{t.tokenInitial}-{t.number}</td>
                  <td className="fw-bold">{t.patientName}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="text-center"><button className="btn btn-sm btn-light" onClick={() => onDeleteToken(t.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPatientModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 p-4 shadow-lg w-100 mx-3" style={{ maxWidth: '400px' }}>
             <h4 className="fw-black mb-4">Manual Entry</h4>
             <div className="mb-3"><label className="small fw-bold">Wing</label><select className="form-select" value={pGroupId} onChange={e => setPGroupId(e.target.value)}><option value="">Select...</option>{clinicGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
             <div className="mb-3"><label className="small fw-bold">Name</label><input className="form-control" value={pName} onChange={e => setPName(e.target.value)} /></div>
             <div className="mb-3"><label className="small fw-bold">Phone</label><input className="form-control" value={pPhone} onChange={e => setPPhone(e.target.value)} /></div>
             <div className="d-flex gap-2 mt-4"><button className="btn btn-light flex-grow-1" onClick={() => setShowPatientModal(false)}>Cancel</button><button className="btn btn-primary flex-grow-1" onClick={handleSavePatient}>Confirm</button></div>
          </div>
        </div>
      )}

      {showQuickIssueModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 p-4 shadow-lg w-100 mx-3" style={{ maxWidth: '400px' }}>
            <h5 className="fw-black mb-1 text-primary">Generate Token</h5>
            <h3 className="fw-black mb-4">{showQuickIssueModal.name}</h3>
            {!issuedToken ? (
              <>
                <select className="form-select mb-4" value={quickIssueGroupId} onChange={e => setQuickIssueGroupId(e.target.value)}><option value="">Select Wing...</option>{clinicGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <div className="d-flex gap-2"><button className="btn btn-light flex-grow-1" onClick={() => setShowQuickIssueModal(null)}>Back</button><button className="btn btn-primary flex-grow-1" onClick={handleQuickIssue}>Issue Token</button></div>
              </>
            ) : (
              <div className="text-center">
                <div className="h1 fw-black text-primary mb-4">{issuedToken.tokenInitial}-{issuedToken.number}</div>
                <button className="btn btn-primary w-100" onClick={() => { setShowQuickIssueModal(null); setIssuedToken(null); }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicAdminDashboard;