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
  // Added onUpdateTokenStatus to fix Prop type error in App.tsx
  onUpdateTokenStatus: (tokenId: string, status: Token['status'], cabinId?: string) => void;
  onDeleteToken: (id: string) => void;
  onUpdateClinic: (c: Clinic) => void;
  onCreateToken: (name: string, data: Record<string, string>, clinicId: string, formId?: string) => Token;
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
  
  // Filtering and Sorting for Patients Tab
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSortConfig, setPatientSortConfig] = useState<{ key: PatientSortKey, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  
  // Filtering and Sorting for Live Queue Tab
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueSortConfig, setQueueSortConfig] = useState<{ key: QueueSortKey, direction: 'asc' | 'desc' } | null>({ key: 'timestamp', direction: 'asc' });

  // History Modal Specific Filters
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTill, setHistoryTill] = useState('');
  const [historyDoctor, setHistoryDoctor] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const [isHistoryFilterCollapsed, setIsHistoryFilterCollapsed] = useState(true);

  // Single token expansion state for queue
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  // Row expansion for groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter for Dashboard/Live Queue
  const [selectedQueueGroupId, setSelectedQueueGroupId] = useState<string>('ALL');

  // Quick Issue selection state
  const [quickIssueGroupId, setQuickIssueGroupId] = useState('');

  // Notification state
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'danger' } | null>(null);

  // Edit target states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [editingGroup, setEditingGroup] = useState<ClinicGroup | null>(null);
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null);
  const [editingToken, setEditingToken] = useState<Token | null>(null);

  // Clinic Profile States (Settings Tab)
  const [profileName, setProfileName] = useState(currentClinic.name);
  const [profilePhone, setProfilePhone] = useState(currentClinic.phone);
  const [profileEmail, setProfileEmail] = useState(currentClinic.email);
  const [profileAddress, setProfileAddress] = useState(currentClinic.address);
  const [profileCity, setProfileCity] = useState(currentClinic.city);
  const [profileState, setProfileState] = useState(currentClinic.state);
  const [profilePincode, setProfilePincode] = useState(currentClinic.pincode);
  const [profileLogo, setProfileLogo] = useState(currentClinic.logo || '');
  const [profileSpecialties, setProfileSpecialties] = useState<string[]>(currentClinic.specialties || []);

  // Form input states for modals
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userSpecialty, setUserSpecialty] = useState('');
  const [userRole, setUserRole] = useState<Role>('DOCTOR');
  const [userPassword, setUserPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [cabinNameInput, setCabinNameInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [tokenInitialInput, setTokenInitialInput] = useState('');
  const [formTitleInput, setFormTitleInput] = useState('');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [selectedCabins, setSelectedCabins] = useState<string[]>([]);

  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAge, setPAge] = useState('');
  const [pGender, setPGender] = useState('Male');
  const [pEmail, setPEmail] = useState('');
  const [pGroupId, setPGroupId] = useState('');

  const triggerNotification = (message: string, type: 'success' | 'danger' = 'success') => {
    setNotification({ message, type }); setTimeout(() => setNotification(null), 3000);
  };

  // Sync form states with editing targets
  useEffect(() => {
    if (editingUser) {
      setUserName(editingUser.name);
      setUserEmail(editingUser.email);
      setUserPhone(editingUser.phone || '');
      setUserSpecialty(editingUser.specialty || '');
      setUserRole(editingUser.role);
      setUserPassword('');
    } else {
      setUserName(''); setUserEmail(''); setUserPhone(''); setUserSpecialty(''); setUserRole('DOCTOR'); setUserPassword('');
    }
  }, [editingUser, showUserModal]);

  useEffect(() => {
    if (editingGroup) {
      setGroupNameInput(editingGroup.name);
      setTokenInitialInput(editingGroup.tokenInitial || '');
      setFormTitleInput(editingGroup.formTitle || '');
      setSelectedDoctors(editingGroup.doctorIds || []);
      setSelectedAssistants(editingGroup.assistantIds || []);
      setSelectedScreens(editingGroup.screenIds || []);
      setSelectedCabins(editingGroup.cabinIds || []);
    } else {
      setGroupNameInput(''); setTokenInitialInput(''); setFormTitleInput(''); setSelectedDoctors([]); setSelectedAssistants([]); setSelectedScreens([]); setSelectedCabins([]);
    }
  }, [editingGroup, showGroupModal]);

  useEffect(() => {
    if (editingCabin) {
      setCabinNameInput(editingCabin.name);
    } else {
      setCabinNameInput('');
    }
  }, [editingCabin, showCabinModal]);

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
  }, [editingToken, showPatientModal]);

  // UI Helpers
  const clinicUsers = state.users.filter(u => u.clinicId === clinicId && u.id !== user.id);
  const clinicCabins = state.cabins.filter(c => c.clinicId === clinicId);
  const clinicGroups = state.groups.filter(g => g.clinicId === clinicId);
  const clinicTokens = state.tokens.filter(t => t.clinicId === clinicId);
  
  const doctors = clinicUsers.filter(u => u.role === 'DOCTOR');
  const assistants = clinicUsers.filter(u => u.role === 'ASSISTANT');
  const screens = clinicUsers.filter(u => u.role === 'SCREEN');

  // Deriving unique patients for the clinic registry
  const uniquePatients = useMemo(() => {
    const map = new Map<string, {name: string, age: string, gender: string, phone: string, email: string}>();
    const term = patientSearchQuery.toLowerCase().trim();

    clinicTokens.forEach(t => {
      const pNameLow = t.patientName.toLowerCase();
      const pEmailLow = (t.patientData.email || t.patientEmail || '').toLowerCase();
      const pPhoneLow = (t.patientData.phone || '').toLowerCase();
      
      const matchSearch = !term || pNameLow.includes(term) || pEmailLow.includes(term) || pPhoneLow.includes(term);
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

  // Derived Live Queue Tokens with Sorting and Filtering
  const filteredSortedQueue = useMemo(() => {
    let result = clinicTokens.filter(t => (selectedQueueGroupId === 'ALL' || t.groupId === selectedQueueGroupId) && (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW'));
    
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
          case 'number':
            valA = a.number; valB = b.number;
            break;
          case 'patientName':
            valA = a.patientName.toLowerCase(); valB = b.patientName.toLowerCase();
            break;
          case 'group':
            valA = (state.groups.find(g => g.id === a.groupId)?.name || '').toLowerCase();
            valB = (state.groups.find(g => g.id === b.groupId)?.name || '').toLowerCase();
            break;
          case 'timestamp':
          case 'wait': // Wait time is inversely proportional to timestamp
            valA = a.timestamp; valB = b.timestamp;
            break;
          case 'status':
            valA = a.status; valB = b.status;
            break;
          default:
            return 0;
        }

        if (valA < valB) return queueSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return queueSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by time
      result.sort((a, b) => a.timestamp - b.timestamp);
    }

    return result;
  }, [clinicTokens, selectedQueueGroupId, queueSearchQuery, queueSortConfig, state.groups]);

  // Action Handlers
  const handleSaveUser = () => {
    if (!userName || !userEmail) return;
    const uData: User = { 
      id: editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9), 
      name: userName, 
      email: userEmail, 
      phone: userRole !== 'SCREEN' ? userPhone : undefined, 
      specialty: userRole === 'DOCTOR' ? userSpecialty : undefined, 
      password: (editingUser && !userPassword) ? editingUser.password : (userPassword || 'password'), 
      role: userRole, 
      clinicId 
    };
    editingUser ? onUpdateUser(uData) : onAddUser(uData);
    setShowUserModal(false);
    triggerNotification(editingUser ? "User updated." : "User added.");
  };

  const handleResetPassword = () => {
    if (!resettingUser || !newPassword) return;
    onUpdateUser({ ...resettingUser, password: newPassword });
    setShowResetModal(false);
    setNewPassword('');
    triggerNotification("Password reset successful.");
  };

  const handleSaveGroup = () => {
    if (!groupNameInput) return;
    const gData: ClinicGroup = { 
      id: editingGroup ? editingGroup.id : Math.random().toString(36).substr(2, 9), 
      name: groupNameInput, 
      tokenInitial: tokenInitialInput.toUpperCase(),
      formTitle: formTitleInput,
      clinicId, 
      doctorIds: selectedDoctors, 
      assistantIds: selectedAssistants, 
      screenIds: selectedScreens, 
      cabinIds: selectedCabins, 
      formId: editingGroup?.formId
    };
    editingGroup ? onUpdateGroup(gData) : onAddGroup(gData);
    setShowGroupModal(false);
    triggerNotification(editingGroup ? "Group updated." : "Group created.");
  };

  const handleSaveCabin = () => {
    if (!cabinNameInput) return;
    const cData: Cabin = { 
      id: editingCabin ? editingCabin.id : Math.random().toString(36).substr(2, 9), 
      name: cabinNameInput, 
      clinicId, 
      currentDoctorId: editingCabin?.currentDoctorId 
    };
    editingCabin ? onUpdateCabin(cData) : onAddCabin(cData);
    setShowCabinModal(false);
    triggerNotification(editingCabin ? "Cabin updated." : "Cabin added.");
  };

  const handleSavePatient = () => {
    if (!pName) return;
    const patientData: Record<string, string> = { phone: pPhone, age: pAge, gender: pGender, email: pEmail };
    if (editingToken) {
      onUpdateToken({
        ...editingToken,
        patientName: pName,
        patientData: patientData,
        groupId: pGroupId || editingToken.groupId
      });
      triggerNotification("Patient updated.");
    } else {
      if (!pGroupId) { alert("Select a group for check-in."); return; }
      const group = state.groups.find(g => g.id === pGroupId);
      if (group) {
        onCreateToken(pName, patientData, clinicId, group.formId);
        triggerNotification("Patient check-in successful.");
      }
    }
    setShowPatientModal(false);
  };

  const handleQuickIssue = () => {
    if (!showQuickIssueModal || !quickIssueGroupId) return;
    const group = state.groups.find(g => g.id === quickIssueGroupId);
    if (!group) return;

    const patientData = {
      phone: showQuickIssueModal.phone,
      age: showQuickIssueModal.age,
      gender: showQuickIssueModal.gender,
      email: showQuickIssueModal.email
    };

    const newToken = onCreateToken(showQuickIssueModal.name, patientData, clinicId, group.formId);
    setIssuedToken(newToken);
  };

  const handleSaveClinicProfile = () => {
    onUpdateClinic({
      ...currentClinic,
      name: profileName,
      phone: profilePhone,
      email: profileEmail,
      address: profileAddress,
      city: profileCity,
      state: profileState,
      pincode: profilePincode,
      logo: profileLogo,
      specialties: profileSpecialties
    });
    triggerNotification("Clinic profile updated successfully.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const executeDelete = () => {
    if (!showDeleteConfirm) return;
    const { id, type } = showDeleteConfirm;
    if (type === 'CABIN') onDeleteCabin(id); 
    else if (type === 'GROUP') onDeleteGroup(id); 
    else if (type === 'USER') onDeleteUser(id); 
    else if (type === 'TOKEN') onDeleteToken(id);
    triggerNotification("Removed successfully.", 'danger');
    setShowDeleteConfirm(null);
  };

  const executeCancel = () => {
    if (!showCancelConfirm) return;
    const token = state.tokens.find(t => t.id === showCancelConfirm.id);
    if (token) {
      onUpdateToken({ ...token, status: 'CANCELLED' });
      triggerNotification("Token cancelled.");
    }
    setShowCancelConfirm(null);
  };

  const formatTime = (ts?: number) => {
    return ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
  };

  const formatDateTime = (ts?: number) => ts ? new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';

  const toggleGroupExpand = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setExpandedGroups(next);
  };

  const toggleTokenExpand = (tokenId: string) => {
    setExpandedTokenId(prev => prev === tokenId ? null : tokenId);
  };

  const copyGroupLink = (formId?: string) => {
    if (!formId) return;
    const url = `${window.location.origin}/register/${formId}`;
    navigator.clipboard.writeText(url);
    triggerNotification("Registration link copied to clipboard.");
  };

  const requestPatientSort = (key: PatientSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (patientSortConfig && patientSortConfig.key === key && patientSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setPatientSortConfig({ key, direction });
  };

  const requestQueueSort = (key: QueueSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (queueSortConfig && queueSortConfig.key === key && queueSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setQueueSortConfig({ key, direction });
  };

  const printQrCode = (qrUrl: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const logoHtml = currentClinic.logo 
        ? `<img src="${currentClinic.logo}" class="clinic-logo" />` 
        : '<div class="clinic-icon">🏥</div>';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR - ${title}</title>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                flex-direction: column; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                font-family: 'Plus Jakarta Sans', sans-serif;
                text-align: center;
                background-color: white;
              }
              .card {
                border: 2px solid #f1f5f9;
                padding: 40px 60px;
                border-radius: 40px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                max-width: 600px;
                width: 90%;
              }
              .clinic-header {
                display: flex; 
                flex-direction: column;
                align-items: center;
                margin-bottom: 30px;
              }
              .clinic-logo {
                width: 80px;
                height: 80px;
                object-fit: contain;
                margin-bottom: 15px;
              }
              .clinic-icon {
                font-size: 60px;
                margin-bottom: 15px;
              }
              .clinic-name {
                font-size: 28px;
                font-weight: 800;
                color: #2563eb;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .qr-code { 
                width: 350px; 
                height: 350px; 
                margin: 20px 0;
                padding: 10px;
                border: 1px solid #f1f5f9;
                border-radius: 20px;
              }
              h1 { font-size: 36px; font-weight: 900; margin: 10px 0 0 0; color: #1e293b; letter-spacing: -0.02em; }
              p { font-size: 20px; color: #64748b; margin-top: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
              hr { width: 100%; border: none; border-top: 2px dashed #e2e8f0; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="clinic-header">
                ${logoHtml}
                <h2 class="clinic-name">${currentClinic.name}</h2>
              </div>
              <hr />
              <img src="${qrUrl}" class="qr-code" onload="window.print(); window.onafterprint = function() { window.close(); };" />
              <h1>${title}</h1>
              <p>Scan to Join Queue</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
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

  // Queue Statistics calculation based on selection
  const filteredTokensForStats = useMemo(() => {
    return selectedQueueGroupId === 'ALL' 
      ? clinicTokens 
      : clinicTokens.filter(t => t.groupId === selectedQueueGroupId);
  }, [clinicTokens, selectedQueueGroupId]);

  const queueStats = {
    total: filteredTokensForStats.length,
    inQueue: filteredTokensForStats.filter(t => t.status === 'WAITING').length,
    attended: filteredTokensForStats.filter(t => t.status === 'COMPLETED').length,
    noShows: filteredTokensForStats.filter(t => t.status === 'NO_SHOW').length,
  };

  // Next Token per group (Priority calculation)
  const groupPriorityTokens = useMemo(() => {
    return clinicGroups.map(group => {
      const next = clinicTokens
        .filter(t => t.groupId === group.id && t.status === 'WAITING')
        .sort((a,b) => a.timestamp - b.timestamp)[0];
      return { group, next };
    });
  }, [clinicGroups, clinicTokens]);

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
        <div className="animate-fade-in">
          
          {/* Top Level Queue Summary Row - col-lg-3 as requested */}
          <div className="row g-2 mb-3">
             <InternalStatCard title="Total Patients" value={queueStats.total} icon="👥" color="primary" />
             <InternalStatCard title="In Waiting" value={queueStats.inQueue} icon="⏱️" color="warning" />
             <InternalStatCard title="Attended" value={queueStats.attended} icon="✅" color="success" />
             <InternalStatCard title="Skipped" value={queueStats.noShows} icon="🚫" color="danger" />
          </div>

          {/* Dashboard Group Selector Tabs */}
          <div className="mb-4">
             <div className="d-flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedQueueGroupId('ALL')}
                  className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-sm d-flex align-items-center gap-2 ${
                    selectedQueueGroupId === 'ALL' ? 'bg-primary text-white' : 'bg-white text-slate-400 hover-bg-slate'
                  }`}
                  style={{ fontSize: '0.65rem', padding: '0.5rem 1.25rem', whiteSpace: 'nowrap' }}
                >
                  <span style={{ fontSize: '0.9rem' }}>📊</span> Aggregate View
                </button>
                {clinicGroups.map(g => (
                  <button 
                    key={g.id}
                    onClick={() => setSelectedQueueGroupId(g.id)}
                    className={`btn rounded-3 fw-black text-uppercase tracking-widest transition-all border-0 shadow-sm d-flex align-items-center gap-2 ${
                      selectedQueueGroupId === g.id ? 'bg-primary text-white' : 'bg-white text-slate-400 hover-bg-slate'
                    }`}
                    style={{ fontSize: '0.65rem', padding: '0.5rem 1.25rem', whiteSpace: 'nowrap' }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>🏨</span> {g.name}
                  </button>
                ))}
             </div>
          </div>

          {/* Dashboard Widgets Row: Next in Line and Station Activity */}
          <div className="row g-4 mb-4">
             {/* Priorities Section - Next patients waiting per group */}
             <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 bg-white h-100 overflow-hidden d-flex flex-column">
                  <div className="card-header bg-white py-3 px-4 border-bottom">
                    <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.85rem' }}>Next in Line</h5>
                  </div>
                  <div className="card-body p-0 overflow-hidden flex-grow-1">
                    <div className="table-responsive h-100 overflow-y-auto no-scrollbar" style={{ maxHeight: '400px' }}>
                      <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.7rem' }}>
                        <thead className="bg-light sticky-top" style={{ zIndex: 10 }}>
                          <tr className="text-nowrap text-slate-500">
                            <th className="ps-4 py-2">Wing</th>
                            <th className="py-2 text-center">Token</th>
                            <th className="pe-4 py-2">Patient</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupPriorityTokens
                            .filter(({ group }) => selectedQueueGroupId === 'ALL' || group.id === selectedQueueGroupId)
                            .map(({ group, next }) => (
                            <tr key={group.id} className="transition-all hover-bg-light">
                              <td className="ps-4 py-3">
                                <div className="text-xxs fw-black text-slate-400 text-uppercase truncate" style={{ maxWidth: '120px' }}>{group.name}</div>
                              </td>
                              <td className="py-3 text-center">
                                <span className="fw-black text-primary" style={{ fontSize: '0.75rem' }}>
                                  {next ? `${next.tokenInitial ? next.tokenInitial + '-' : ''}${next.number}` : '---'}
                                </span>
                              </td>
                              <td className="pe-4 py-3">
                                <div className="fw-bold text-dark truncate" style={{ maxWidth: '150px' }}>
                                  {next ? next.patientName : <span className="text-slate-200 italic">--</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {groupPriorityTokens.length === 0 && (
                            <tr><td colSpan={3} className="text-center py-4 text-muted italic small">No groups configured.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
             </div>

             {/* Station Activity Card */}
             <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 bg-white h-100 overflow-hidden">
                  <div className="card-header bg-white py-3 px-4 border-bottom">
                    <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.85rem' }}>Station Activity</h5>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '400px' }}>
                    <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.7rem' }}>
                       <thead className="bg-light sticky-top" style={{ zIndex: 10 }}>
                          <tr className="text-nowrap text-slate-500">
                             <th className="ps-4 py-2">Room</th>
                             <th className="py-2">Doctor</th>
                             <th className="text-center py-2">Status</th>
                             <th className="pe-4 text-end py-2">Serving</th>
                          </tr>
                       </thead>
                       <tbody>
                          {clinicCabins.filter(c => {
                             if (selectedQueueGroupId === 'ALL') return true;
                             const group = clinicGroups.find(g => g.id === selectedQueueGroupId);
                             return group?.cabinIds.includes(c.id);
                          }).map(cabin => {
                             const activeToken = state.tokens.find(t => (t.status === 'CALLING' || t.status === 'CONSULTING') && t.cabinId === cabin.id);
                             const doc = state.users.find(u => u.id === cabin.currentDoctorId);
                             return (
                                <tr key={cabin.id}>
                                   <td className="ps-4 py-3 fw-bold text-dark">{cabin.name}</td>
                                   <td className="py-3">
                                      <div className="text-xxs fw-black text-indigo-dark text-uppercase truncate" style={{ maxWidth: '120px' }}>{doc?.name || '-'}</div>
                                   </td>
                                   <td className="text-center py-3">
                                      <span className={`badge rounded-pill px-2 py-0.5 text-xxs fw-bold ${
                                        activeToken 
                                          ? (activeToken.status === 'CALLING' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-info bg-opacity-10 text-info') 
                                          : (cabin.currentDoctorId ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted')
                                      }`}>
                                         {activeToken ? activeToken.status.charAt(0) : (cabin.currentDoctorId ? 'R' : 'OFF')}
                                      </span>
                                   </td>
                                   <td className="pe-4 text-end py-3">
                                      {activeToken ? (
                                         <span className="fw-black text-primary" style={{ fontSize: '0.75rem' }}>{activeToken.tokenInitial}-{activeToken.number}</span>
                                      ) : (
                                         <span className="text-slate-300">--</span>
                                      )}
                                   </td>
                                </tr>
                             );
                          }).slice(0, 10)}
                       </tbody>
                    </table>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="animate-fade-in">
          {/* Aggregated Live Queue Table section */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
               <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Aggregated Live Queue</h5>
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
                  {/* Group Dropdown Filter */}
                  <div style={{ minWidth: '180px' }}>
                    <SearchableSelect 
                      options={clinicGroups.map(g => ({ id: g.id, label: g.name }))}
                      value={selectedQueueGroupId}
                      onChange={setSelectedQueueGroupId}
                      placeholder="All Groups"
                      size="sm"
                    />
                  </div>
                  <button className="btn btn-primary-pro text-nowrap" onClick={() => { setEditingToken(null); setShowPatientModal(true); }}>Manual Check-in</button>
               </div>
            </div>
            <div className="table-responsive">
              <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr className="text-nowrap text-slate-500 bg-light bg-opacity-50">
                    <th style={{ width: '40px' }}></th>
                    <th className="pe-2 cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('number')}>
                      <div className="d-flex align-items-center gap-1">
                        No. {queueSortConfig?.key === 'number' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('patientName')}>
                      <div className="d-flex align-items-center gap-1">
                        Patient {queueSortConfig?.key === 'patientName' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th className="px-2 cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('group')}>
                      <div className="d-flex align-items-center gap-1">
                        Group {queueSortConfig?.key === 'group' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th className="px-2 text-center cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('timestamp')}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        Issued Date/Time {queueSortConfig?.key === 'timestamp' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th className="px-2 text-center cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('wait')}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        Wait {queueSortConfig?.key === 'wait' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th className="px-2 text-center cursor-pointer hover-bg-slate" onClick={() => requestQueueSort('status')}>
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        Status {queueSortConfig?.key === 'status' && (queueSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th className="pe-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedQueue.map(t => {
                      const isExpanded = expandedTokenId === t.id;
                      const group = state.groups.find(g => g.id === t.groupId);
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
                            <td className="px-2 py-2"><div className="text-slate-700 text-xxs fw-extrabold text-uppercase tracking-tighter truncate" style={{maxWidth: '100px'}}>{group?.name || 'General'}</div></td>
                            <td className="px-2 py-2 text-center"><div className="text-primary fw-bold text-xxs">{formatDateTime(t.timestamp)}</div></td>
                            <td className="px-2 py-2 text-center"><WaitTimeBadge minutes={waitMinutes} /></td>
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
                              <td colSpan={8} className="p-0">
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
                  {filteredSortedQueue.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-5 text-muted italic">No patients in queue matching selection.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Patients Tab - Matching Central Register Registry */}
      {activeTab === 'patients' && (
        <div className="animate-fade-in">
          {/* Top Registry Filter Bar */}
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
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted italic">No patients found matching criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white animate-fade-in">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Clinic Groups</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}>Create Group</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr className="text-nowrap">
                  <th style={{ width: '40px' }}></th>
                  <th className="ps-0">Group Name</th>
                  <th className="px-1" style={{ width: '140px' }}>Resources</th>
                  <th className="text-center px-1">Registration Form</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clinicGroups.map(g => {
                  const isExpanded = expandedGroups.has(g.id);
                  const form = state.forms.find(f => f.id === g.formId);
                  return (
                    <React.Fragment key={g.id}>
                      <tr className={isExpanded ? 'bg-slate-50' : ''}>
                        <td className="text-center">
                          <button className="btn btn-sm p-0 border-0 shadow-none text-slate-400" onClick={() => toggleGroupExpand(g.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </button>
                        </td>
                        <td className="ps-0"><div className="fw-bold text-dark">{g.name}</div>{g.tokenInitial && <div className="text-xxs text-primary fw-bold">Initial: {g.tokenInitial}</div>}</td>
                        <td className="px-1"><div className="d-flex flex-wrap gap-1" style={{ width: '130px' }}><span className="badge bg-primary bg-opacity-10 text-primary text-xxs fw-bold">{g.doctorIds.length} Docs</span><span className="badge bg-warning bg-opacity-10 text-warning text-xxs fw-bold">{g.assistantIds.length} Asst</span><span className="badge bg-success bg-opacity-10 text-success text-xxs fw-bold">{g.screenIds.length} Screens</span><span className="badge bg-info bg-opacity-10 text-info text-xxs fw-bold">{g.cabinIds.length} Cabins</span></div></td>
                        <td className="text-center px-1"><div className="d-flex justify-content-center gap-1">{form ? (<><IconButton title="Preview Form" onClick={() => onPreviewForm(form.id, clinicId)} color="primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11-8 11-8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></IconButton><IconButton title="Show QR Code" onClick={() => setShowQrModal(form)} color="indigo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></IconButton><IconButton title="Copy Registration Link" onClick={() => copyGroupLink(form.id)} color="indigo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></IconButton><IconButton title="Print QR Code" onClick={() => printQrCode(form.qrCodeUrl, form.name)} color="indigo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></IconButton></>) : <span className="text-muted text-xxs italic">No form linked</span>}</div></td>
                        <td className="text-center pe-3"><div className="d-flex justify-content-center gap-1"><IconButton title="Edit Group" onClick={() => { setEditingGroup(g); setShowGroupModal(true); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></IconButton><IconButton title="Delete Group" color="danger" onClick={() => setShowDeleteConfirm({ id: g.id, type: 'GROUP', name: g.name })}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></IconButton></div></td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 border-bottom"><td colSpan={5} className="p-0"><div className="p-4 animate-fade-in"><div className="row g-4"><div className="col-md-3"><h6 className="text-xxs fw-black text-uppercase text-slate-400 mb-2">Doctors</h6>{g.doctorIds.length > 0 ? (<div className="d-flex flex-column gap-1">{g.doctorIds.map(id => { const doc = state.users.find(u => u.id === id); return <div key={id} className="small fw-bold text-dark">{doc?.name || 'Unknown'}</div>; })}</div>) : <span className="text-muted text-xxs italic">None assigned</span>}</div><div className="col-md-3"><h6 className="text-xxs fw-black text-uppercase text-slate-400 mb-2">Assistants</h6>{g.assistantIds.length > 0 ? (<div className="d-flex flex-column gap-1">{g.assistantIds.map(id => { const asst = state.users.find(u => u.id === id); return <div key={id} className="small fw-bold text-dark">{asst?.name || 'Unknown'}</div>; })}</div>) : <span className="text-muted text-xxs italic">None assigned</span>}</div><div className="col-md-3"><h6 className="text-xxs fw-black text-uppercase text-slate-400 mb-2">Screens</h6>{g.screenIds.length > 0 ? (<div className="d-flex flex-column gap-1">{g.screenIds.map(id => { const scr = state.users.find(u => u.id === id); return <div key={id} className="small fw-bold text-dark">{scr?.name || 'Unknown'}</div>; })}</div>) : <span className="text-muted text-xxs italic">None assigned</span>}</div><div className="col-md-3"><h6 className="text-xxs fw-black text-uppercase text-slate-400 mb-2">Cabins</h6>{g.cabinIds.length > 0 ? (<div className="d-flex flex-column gap-1">{g.cabinIds.map(id => { const cab = state.cabins.find(c => c.id === id); return <div key={id} className="small fw-bold text-dark">{cab?.name || 'Unknown'}</div>; })}</div>) : <span className="text-muted text-xxs italic">None assigned</span>}</div></div></div></td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cabins Tab */}
      {activeTab === 'cabins' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white animate-fade-in">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Clinic Stations</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingCabin(null); setShowCabinModal(true); }}>Add Cabin</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead><tr className="text-nowrap"><th className="ps-3">Name</th><th>Status</th><th className="text-center pe-3">Actions</th></tr></thead>
              <tbody>
                {clinicCabins.map(c => (
                  <tr key={c.id}>
                    <td className="ps-3 fw-bold text-dark">{c.name}</td>
                    <td>{c.currentDoctorId ? (<span className="badge bg-success bg-opacity-10 text-success text-xxs fw-bold">OCCUPIED</span>) : (<span className="badge bg-light text-muted text-xxs fw-bold">VACANT</span>)}</td>
                    <td className="text-center pe-3"><div className="d-flex justify-content-center gap-1"><IconButton onClick={() => { setEditingCabin(c); setShowCabinModal(true); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></IconButton><IconButton color="danger" onClick={() => setShowDeleteConfirm({ id: c.id, type: 'CABIN', name: c.name })}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></IconButton></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white animate-fade-in">
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Users</h5>
            <button className="btn btn-primary-pro" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>Onboard Staff</button>
          </div>
          <div className="table-responsive">
            <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
              <thead><tr className="text-nowrap"><th className="ps-3">Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Specialty</th><th className="text-center pe-3">Actions</th></tr></thead>
              <tbody>
                {clinicUsers.map(u => (
                  <tr key={u.id}>
                    <td className="ps-3"><div className="fw-bold text-dark">{u.name}</div></td>
                    <td><div className="text-xxs text-primary fw-bold text-uppercase">{u.role.replace('_', ' ')}</div></td>
                    <td className="text-muted">{u.email}</td>
                    <td className="text-muted fw-bold">{u.phone || '-'}</td>
                    <td><span className="badge bg-light text-dark text-xxs fw-bold">{u.specialty || '-'}</span></td>
                    <td className="text-center pe-3"><div className="d-flex justify-content-center gap-1"><IconButton title="Reset Password" color="primary" onClick={() => { setResettingUser(u); setShowResetModal(true); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></IconButton><IconButton onClick={() => { setEditingUser(u); setShowUserModal(true); }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></IconButton><IconButton color="danger" onClick={() => setShowDeleteConfirm({ id: u.id, type: 'USER', name: u.name })}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></IconButton></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden animate-fade-in">
           <div className="card-header bg-white py-3 px-4 border-bottom"><h5 className="mb-0 fw-extrabold text-dark" style={{ fontSize: '0.9rem' }}>Clinic Profile Management</h5></div>
           <div className="card-body p-4 p-md-5"><div className="row g-4"><div className="col-lg-3 text-center border-end pe-lg-5"><div className="position-relative d-inline-block mb-3"><div className="bg-slate-50 border rounded-4 overflow-hidden d-flex align-items-center justify-content-center" style={{ width: '150px', height: '150px' }}>{profileLogo ? (<img src={profileLogo} className="w-100 h-100 object-fit-contain" alt="Logo" />) : (<div className="text-center"><span className="display-4 opacity-25">🏥</span><p className="text-xxs fw-bold text-muted text-uppercase mb-0">No Logo</p></div>)}</div><label htmlFor="clinic-logo-upload" className="position-absolute bottom-0 end-0 bg-primary text-white p-2 rounded-circle border border-white cursor-pointer hover-shadow-all" style={{ width: '36px', height: '36px', transform: 'translate(25%, 25%)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg><input id="clinic-logo-upload" type="file" hidden accept="image/*" onChange={handleLogoUpload} /></label></div><p className="text-xxs fw-bold text-muted text-uppercase tracking-widest mt-2">Clinic Branding</p></div><div className="col-lg-9 ps-lg-5"><div className="row g-3"><div className="col-md-6"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Clinic Name</label><input className="form-control form-control-pro" value={profileName} onChange={e => setProfileName(e.target.value)} /></div><div className="col-md-6"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Public Contact No.</label><input className="form-control form-control-pro" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} /></div><div className="col-12"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Public Email Address</label><input className="form-control form-control-pro" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} /></div><div className="col-12"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Physical Address</label><textarea className="form-control form-control-pro" rows={3} value={profileAddress} onChange={e => setProfileAddress(e.target.value)} placeholder="Full street address..." /></div><div className="col-md-4"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">City</label><input className="form-control form-control-pro" value={profileCity} onChange={e => setProfileCity(e.target.value)} /></div><div className="col-md-4"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">State / Region</label><input className="form-control form-control-pro" value={profileState} onChange={e => setProfileState(e.target.value)} /></div><div className="col-md-4"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Pincode / Zip</label><input className="form-control form-control-pro" value={profilePincode} onChange={e => setProfilePincode(e.target.value)} /></div><div className="col-12 pt-3"><div className="mb-3"><label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block tracking-widest">Clinical Specialties</label><MultiSelectDropdown options={state.specialties.filter(s => s.forClinic).map(s => ({ id: s.name, label: s.name }))} selectedIds={profileSpecialties} onChange={setProfileSpecialties} placeholder="Select clinic specialties..." /></div><button className="btn btn-primary-pro px-5" onClick={handleSaveClinicProfile}>Save Profile Changes</button></div></div></div></div></div>
        </div>
      )}
      
      {/* Refined Quick Issue Modal - Unified with Doctor Panel */}
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
                       {/* Green colored badges for Age and Gender */}
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

      {/* Modal Definitions */}
      {(showUserModal || showGroupModal || showCabinModal || showPatientModal || showDeleteConfirm || showQrModal || showResetModal || showHistoryModal) && (
        <BootstrapModal 
          title={
            showUserModal ? (editingUser ? "Update Staff" : "Add Staff Member") :
            showGroupModal ? (editingGroup ? "Modify Clinic Group" : "Create Clinic Group") :
            showCabinModal ? (editingCabin ? "Edit Cabin" : "Add Consultation Room") :
            showPatientModal ? (editingToken ? "Edit Patient" : "Manual Check-in") : 
            showQrModal ? "Group QR Code" : 
            showResetModal ? "Force Password Reset" : 
            showHistoryModal ? `Visit History: ${showHistoryModal.name}` : "Confirm Action"
          } 
          onClose={() => { 
            setShowUserModal(false); setShowGroupModal(false); setShowCabinModal(false); 
            setShowPatientModal(false); setShowDeleteConfirm(null); setShowQrModal(null);
            setShowResetModal(false); setShowHistoryModal(null);
            setHistoryActiveNotes(null);
          }}
          onSave={
            showQrModal ? () => printQrCode(showQrModal.qrCodeUrl, showQrModal.name) :
            showDeleteConfirm ? executeDelete : 
            showUserModal ? handleSaveUser : 
            showGroupModal ? handleSaveGroup : 
            showCabinModal ? handleSaveCabin : 
            showResetModal ? handleResetPassword : 
            showHistoryModal ? () => setShowHistoryModal(null) : handleSavePatient
          }
          saveLabel={showQrModal ? "Print QR" : (showHistoryModal ? "Close" : undefined)}
          customWidth={showHistoryModal ? (historyActiveNotes ? '1100px' : '850px') : undefined}
        >
          {showHistoryModal && (
            <div className={`animate-fade-in ${historyActiveNotes ? 'row g-4' : ''}`}>
              <div className={historyActiveNotes ? 'col-lg-7' : 'col-12'}>
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
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="text-xxs fw-bold text-slate-500 mb-1 d-block">Status</label>
                          <select value={historyStatus} onChange={e => setHistoryStatus(e.target.value)} className="form-select form-control-pro py-1">
                            <option value="">Any</option>
                            <option value="WAITING">Waiting</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="NO_SHOW">No Show</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="table-responsive" style={{ maxHeight: '500px' }}>
                  <table className="table table-pro align-middle mb-0 w-100" style={{ fontSize: '0.7rem' }}>
                    <thead>
                      <tr className="bg-light sticky-top" style={{ zIndex: 10 }}>
                        <th className="ps-2">Token #</th>
                        <th>Group</th>
                        <th>Doctor</th>
                        <th>Issued Date/Time</th>
                        <th className="text-center">Notes</th>
                        <th className="pe-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientHistory.map(h => {
                        const group = state.groups.find(g => g.id === h.groupId);
                        const doctor = state.users.find(u => u.id === h.doctorId);
                        const isCurrentlyActive = historyActiveNotes?.id === h.id;
                        return (
                          <tr key={h.id} className={isCurrentlyActive ? 'bg-primary bg-opacity-5' : ''}>
                            <td className="ps-2 fw-black text-primary">{h.tokenInitial ? h.tokenInitial + '-' : ''}{h.number}</td>
                            <td><div className="text-xxs text-muted fw-bold truncate" style={{maxWidth: '80px'}}>{group?.name || '-'}</div></td>
                            <td><div className="text-xxs text-indigo-dark fw-bold truncate" style={{maxWidth: '80px'}}>{doctor?.name || '-'}</div></td>
                            <td>{formatDateTime(h.timestamp)}</td>
                            <td className="text-center">
                              <IconButton 
                                title="Inspect Visit Notes" 
                                onClick={() => setHistoryActiveNotes({ id: h.id, notes: h.patientData.notes || '' })}
                                color={isCurrentlyActive ? 'primary' : 'teal'}
                                className={isCurrentlyActive ? 'border border-primary' : ''}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></IconButton>
                            </td>
                            <td className="pe-2 text-center"><StatusBadge status={h.status} /></td>
                          </tr>
                        );
                      })}
                      {patientHistory.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-4 text-muted italic">No matching visits found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {historyActiveNotes && (
                <div className="col-lg-5 animate-slide-in">
                  <div className="card h-100 border-0 bg-light rounded-4 overflow-hidden shadow-sm">
                    <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                      <div>
                        <h6 className="text-xxs fw-black text-teal-600 text-uppercase tracking-widest mb-1">Clinical Observations</h6>
                        <div className="text-xs fw-bold text-slate-400">Visit Analysis</div>
                      </div>
                      <button 
                        onClick={() => setHistoryActiveNotes(null)} 
                        className="btn btn-sm btn-light rounded-pill px-3 py-1 fw-bold text-xxs border-0 shadow-none text-uppercase"
                        style={{ fontSize: '0.6rem' }}
                      >
                        Hide
                      </button>
                    </div>
                    <div className="card-body p-4 overflow-y-auto">
                      <div className="text-slate-700 fw-medium lh-base whitespace-pre-wrap" style={{ fontSize: '0.85rem' }}>
                        {historyActiveNotes.notes || "No specific consultation notes were recorded for this patient visit by the attending physician."}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showQrModal && (
            <div className="text-center py-4"><div className="bg-light p-4 rounded-4 d-inline-block shadow-sm mb-3"><img src={showQrModal.qrCodeUrl} alt="Group QR" style={{ width: '180px', height: '180px' }} /></div><h6 className="fw-bold text-dark mb-1">{showQrModal.name}</h6><p className="text-muted small mb-0">Scan to register for this wing</p></div>
          )}

          {showUserModal && (
            <div className="row g-3"><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Staff Name</label><input value={userName} onChange={e => setUserName(e.target.value)} className="form-control form-control-pro" /></div><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Role</label><select className="form-select form-control-pro" value={userRole} onChange={e => setUserRole(e.target.value as Role)}><option value="CLINIC_ADMIN">Clinic Admin</option><option value="DOCTOR">Doctor</option><option value="ASSISTANT">Assistant</option><option value="SCREEN">Queue Display</option></select></div><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Email</label><input value={userEmail} onChange={e => setUserEmail(e.target.value)} className="form-control form-control-pro" /></div>{userRole !== 'SCREEN' && (<div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Phone</label><input value={userPhone} onChange={e => setUserPhone(e.target.value)} className="form-control form-control-pro" placeholder="+91 XXXXX XXXXX" /></div>)}{userRole === 'DOCTOR' && (<div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Specialty</label><select className="form-select form-control-pro" value={userSpecialty} onChange={e => setUserSpecialty(e.target.value)}> <option value="">Select Specialty...</option>{state.specialties.filter(s => s.forDoctor).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>)}{!editingUser && (<div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Temp Password</label><input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} className="form-control form-control-pro" placeholder="••••••••" /></div>)}</div>
          )}

          {showResetModal && (
            <div className="mb-4"><p className="text-muted small mb-3">Updating credentials for: <span className="fw-bold text-indigo-primary">{resettingUser?.name}</span></p><label className="text-xxs fw-bold text-uppercase mb-1 d-block text-slate-500">New Temporary Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-control form-control-pro" placeholder="Enter new password" /></div>
          )}

          {showGroupModal && (
            <div className="row g-3"><div className="col-md-8"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Group Name</label><input value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)} className="form-control form-control-pro" placeholder="e.g. OPD East Wing" /></div><div className="col-md-4"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Token Initial</label><input value={tokenInitialInput} maxLength={3} onChange={e => setTokenInitialInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="form-control form-control-pro" placeholder="e.g. GM" /></div><div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Registration Form Title</label><input value={formTitleInput} onChange={e => setFormTitleInput(e.target.value)} className="form-control form-control-pro" placeholder="e.g. Cardiology OPD Registration" /></div><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Assigned Doctors</label><MultiSelectDropdown options={doctors.map(d => ({ id: d.id, label: d.name }))} selectedIds={selectedDoctors} onChange={setSelectedDoctors} placeholder="Select..." /></div><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Assigned Assistants</label><MultiSelectDropdown options={assistants.map(a => ({ id: a.id, label: a.name }))} selectedIds={selectedAssistants} onChange={setSelectedAssistants} placeholder="Select..." /></div><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Queue Screens</label><MultiSelectDropdown options={screens.map(s => ({ id: s.id, label: s.name }))} selectedIds={selectedScreens} onChange={setSelectedScreens} placeholder="Select..." /></div><div className="col-md-6"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Wing Cabins</label><MultiSelectDropdown options={clinicCabins.map(c => ({ id: c.id, label: c.name }))} selectedIds={selectedCabins} onChange={setSelectedCabins} placeholder="Select..." /></div></div>
          )}

          {showCabinModal && (
            <div className="row g-3"><div className="col-12"><label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Room Name</label><input value={cabinNameInput} onChange={e => setCabinNameInput(e.target.value)} className="form-control form-control-pro" placeholder="Consultation Room 5" /></div></div>
          )}

          {showPatientModal && (
            <div className="row g-3">
              <div className="col-12">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Target Group</label>
                <select className="form-select form-control-pro" value={pGroupId} onChange={e => setPGroupId(e.target.value)}>
                  <option value="">Select Group...</option>
                  {clinicGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="col-12">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Full Name</label>
                <input value={pName} onChange={e => setPName(e.target.value)} className="form-control form-control-pro" />
              </div>
              <div className="col-md-6">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Phone</label>
                <input value={pPhone} onChange={e => setPPhone(e.target.value)} className="form-control form-control-pro" />
              </div>
              <div className="col-md-6">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Email Address (Optional)</label>
                <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} className="form-control form-control-pro" placeholder="patient@example.com" />
              </div>
              <div className="col-md-6">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Age</label>
                <input type="number" value={pAge} onChange={e => setPAge(e.target.value)} className="form-control form-control-pro" />
              </div>
              <div className="col-md-6">
                <label className="text-xxs fw-bold text-slate-500 mb-1 d-block text-uppercase">Gender</label>
                <select className="form-select form-control-pro" value={pGender} onChange={e => setPGender(e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="text-center py-3"><div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-flex mb-3">⚠️</div><h5 className="fw-black text-dark mb-1">Confirm Deletion</h5><p className="text-muted small mb-0">Permanently remove <b>{showDeleteConfirm.name}</b>?</p></div>
          )}
        </BootstrapModal>
      )}

      {showCancelConfirm && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '400px' }}>
            <div className="text-center py-5 px-4">
              <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle d-inline-flex mb-3">⚠️</div>
              <h5 className="fw-black text-dark mb-1">Cancel Token?</h5>
              <p className="text-muted small mb-4">Are you sure you want to cancel <b>{showCancelConfirm.name}</b>'s token?</p>
              <div className="d-flex gap-2">
                <button onClick={() => setShowCancelConfirm(null)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase">Back</button>
                <button onClick={executeCancel} className="btn btn-danger flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none">Yes, Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .hover-bg-slate:hover { background-color: #f1f5f9; }
        .cursor-pointer { cursor: pointer; }
        .table-pro thead th { background-color: #f8fafc; color: #64748b; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-top: none; }
        .table-pro tbody td { border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .hover-shadow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-1px); }
        .transition-all { transition: all 0.2s ease; }
        .scale-up { transform: scale(1.02); }
        ::-webkit-scrollbar { height: 4px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .whitespace-pre-wrap { white-space: pre-wrap; }
        
        /* Fixed responsive column classes for multi-column widgets */
        .col-xl-custom {
          flex: 0 0 auto;
          width: 100% !important;
        }
        @media (min-width: 1400px) {
          .col-xl-custom {
            width: 20% !important;
          }
        }
      `}</style>
    </div>
  );
};

// Reusable Components
const StatCard = ({ title, value, icon, color }: any) => (
  <div className="col-12 col-md-4">
    <div className="card border-0 shadow-sm p-4 rounded-4 bg-white h-100 transition-all pro-shadow-hover">
       <div className={`bg-${color} bg-opacity-10 text-${color} p-2 rounded-3 mb-2 d-inline-flex h5 align-items-center justify-content-center`} style={{width:'40px', height:'40px'}}>{icon}</div>
       <div className="text-xxs fw-extrabold text-secondary text-uppercase">{title}</div>
       <div className="h3 fw-extrabold mb-0 tracking-tight">{value}</div>
    </div>
  </div>
);

const InternalStatCard = ({ title, value, icon, color }: any) => (
  <div className="col-12 col-sm-6 col-lg-3">
    <div className="p-3 rounded-4 bg-white border border-slate-100 shadow-sm transition-all hover-shadow d-flex flex-column align-items-center justify-content-center h-100" style={{ minHeight: '100px' }}>
       <div className="text-xxs fw-black text-slate-500 text-uppercase tracking-widest mb-1 px-1" style={{ fontSize: '0.7rem', textAlign: 'center', opacity: 0.9 }}>{title}</div>
       <div className="d-flex align-items-center justify-content-center gap-2 w-100">
          <div className={`bg-${color} bg-opacity-10 text-${color} rounded-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0`} style={{ width: '48px', height: '48px', fontSize: '1.6rem' }}>{icon}</div>
          <div className="h2 fw-black mb-0 tracking-tighter text-dark lh-1" style={{ fontSize: '2.4rem' }}>{value}</div>
       </div>
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

const BootstrapModal = ({ title, children, onClose, onSave, saveLabel, customWidth }: any) => (
  <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1100 }}>
    <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: customWidth || '480px', transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="px-4 pt-4 pb-2 d-flex justify-content-between align-items-center border-bottom">
        <h6 className="fw-extrabold mb-0 text-uppercase text-indigo-dark" style={{fontSize:'0.8rem'}}>{title}</h6>
        <button onClick={onClose} className="btn-close-round">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div className="p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>{children}</div>
      <div className="d-flex gap-2 px-4 pb-4">
        <button onClick={onClose} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.65rem' }}>Cancel</button>
        <button onClick={onSave} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase" style={{ fontSize: '0.65rem' }}>{saveLabel || "Confirm"}</button>
      </div>
    </div>
  </div>
);

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
        style={{ minHeight: size === 'sm' ? '32px' : '34px' }}
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
              style={{ fontSize: size === 'sm' ? '0.7rem' : 'inherit', color: value === 'ALL' ? 'var(--primary)' : 'inherit', fontWeight: value === 'ALL' ? 'bold' : 'normal' }}
              onClick={() => { onChange('ALL'); setIsOpen(false); setSearchTerm(''); }}
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

const MultiSelectDropdown: React.FC<{ options: { id: string, label: string }[], selectedIds: string[], onChange: (ids: string[]) => void, placeholder: string }> = ({ options, selectedIds, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false); 
      }
    };
    document.addEventListener("mousedown", handleClick); 
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 250);
    }
  }, [isOpen]);

  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

  return (
    <div className="position-relative" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)} className="form-control-pro d-flex flex-wrap gap-1 align-items-center cursor-pointer" style={{ minHeight: '34px' }}>
        {selectedIds.length > 0 ? options.filter(o => selectedIds.includes(o.id)).map(o => <span key={o.id} className="badge bg-primary bg-opacity-10 text-primary border px-2 py-1 rounded-pill d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}><span>{o.label}</span><span onClick={(e) => { e.stopPropagation(); toggle(o.id); }}>×</span></span>) : <span className="text-muted" style={{fontSize:'0.75rem'}}>{placeholder}</span>}
      </div>
      {isOpen && (
        <div 
          className="position-absolute w-100 bg-white border rounded-3 shadow-lg p-2 animate-fade-in" 
          style={{ 
            zIndex: 1500, 
            maxHeight: '200px', 
            overflowY: 'auto',
            bottom: dropUp ? '100%' : 'auto',
            top: dropUp ? 'auto' : '100%',
            marginBottom: dropUp ? '8px' : '0',
            marginTop: dropUp ? '0' : '4px'
          }}
        >
          {options.map(o => (
            <div key={o.id} onClick={() => toggle(o.id)} className={`p-2 rounded cursor-pointer d-flex justify-content-between mb-1 ${selectedIds.includes(o.id) ? 'bg-primary bg-opacity-10 text-primary' : 'hover-bg-slate'}`}>
              <span className="fw-bold" style={{fontSize:'0.75rem'}}>{o.label}</span>
              {selectedIds.includes(o.id) && <span className="small">✓</span>}
            </div>
          ))}
          {options.length === 0 && <div className="p-2 text-muted small italic">No items available</div>}
        </div>
      )}
    </div>
  );
};

export default ClinicAdminDashboard;