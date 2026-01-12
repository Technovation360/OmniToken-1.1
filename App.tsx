
import React, { useState, useEffect } from 'react';
import { User, Clinic, Cabin, RegistrationForm, Token, AdVideo, ClinicGroup, AppState, Advertiser, Specialty } from './types';
import { INITIAL_STATE, FIELD_OPTIONS } from './constants';
import Layout from './components/Layout';
import Login from './pages/Login';
import CentralAdminDashboard from './pages/CentralAdminDashboard';
import ClinicAdminDashboard from './pages/ClinicAdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AssistantDashboard from './pages/AssistantDashboard';
import ScreenDisplay from './pages/ScreenDisplay';
import PatientRegistration from './pages/PatientRegistration';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import { fetchStateForUser, syncUpsert, syncDelete } from './services/supabaseService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [registrationView, setRegistrationView] = useState<{formId?: string, clinicId: string} | null>(null);
  const [activeTab, setActiveTab] = useState<string>('insights');

  // 1. Session Recovery on Mount
  useEffect(() => {
    const savedUser = localStorage.getItem('omnitoken_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setIsLoading(false);
    }
  }, []);

  // 2. Fetch data whenever currentUser changes
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        setIsLoading(true);
        const dbState = await fetchStateForUser(currentUser);
        setState(prev => ({
          ...prev,
          ...dbState,
          clinics: dbState.clinics || [],
          users: dbState.users || [],
          advertisers: dbState.advertisers || [],
          tokens: dbState.tokens || [],
          groups: dbState.groups || [],
          specialties: dbState.specialties || [],
          cabins: dbState.cabins || [],
          forms: dbState.forms || [],
          videos: dbState.videos || [],
        }));

        // Set default tabs
        if (currentUser.role === 'CENTRAL_ADMIN' || currentUser.role === 'CLINIC_ADMIN') setActiveTab('insights');
        else if (currentUser.role === 'DOCTOR' || currentUser.role === 'ASSISTANT') setActiveTab('dashboard');
        else if (currentUser.role === 'ADVERTISER') setActiveTab('stats');
        
        setIsLoading(false);
      }
    };
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser?.id]);

  // 3. Handle Deep Linking for Registration Forms (Render-specific sub-routes)
  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      if (path.startsWith('/register/')) {
        const formId = path.split('/register/')[1];
        if (formId) {
          // Attempt to find form once state is loaded
          if (state.forms.length > 0) {
            const form = state.forms.find(f => f.id === formId);
            if (form) {
              setRegistrationView({ formId: form.id, clinicId: form.clinicId });
            }
          }
        }
      }
    };
    
    if (!isLoading) {
      handleRouting();
    }
  }, [isLoading, state.forms]);

  const handleLogin = (user: User) => {
    localStorage.setItem('omnitoken_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('omnitoken_user');
    setCurrentUser(null);
    setState(INITIAL_STATE);
  };

  // Synchronous State Handlers with Supabase Sync
  const addClinic = async (clinic: Clinic) => {
    setState(prev => ({ ...prev, clinics: [...prev.clinics, clinic] }));
    await syncUpsert('clinics', clinic);
  };
  
  const deleteClinic = async (id: string) => {
    setState(prev => ({ ...prev, clinics: prev.clinics.filter(c => c.id !== id) }));
    await syncDelete('clinics', id);
  };

  const updateClinic = async (clinic: Clinic) => {
    setState(prev => ({
      ...prev,
      clinics: prev.clinics.map(c => c.id === clinic.id ? clinic : c)
    }));
    await syncUpsert('clinics', clinic);
  };
  
  const addUser = async (user: User) => {
    setState(prev => ({ ...prev, users: [...prev.users, user] }));
    await syncUpsert('users', user);
  };

  const deleteUser = async (id: string) => {
    setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    await syncDelete('users', id);
  };

  const updateUser = async (user: User) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === user.id ? user : u)
    }));
    if (currentUser && currentUser.id === user.id) {
      setCurrentUser(user);
      localStorage.setItem('omnitoken_user', JSON.stringify(user));
    }
    await syncUpsert('users', user);
  };

  const addSpecialty = async (s: Specialty) => {
    setState(prev => ({ ...prev, specialties: [...prev.specialties, s] }));
    await syncUpsert('specialties', s);
  };

  const deleteSpecialty = async (id: string) => {
    const spec = state.specialties.find(s => s.id === id);
    if (!spec) return;
    setState(prev => ({
      ...prev,
      specialties: prev.specialties.filter(item => item.id !== id),
      clinics: prev.clinics.map(c => ({ ...c, specialties: c.specialties?.filter(name => name !== spec.name) || [] })),
      users: prev.users.map(u => ({ ...u, specialty: u.specialty === spec.name ? undefined : u.specialty }))
    }));
    await syncDelete('specialties', id);
  };

  const updateSpecialty = async (id: string, updated: Specialty) => {
    const oldSpec = state.specialties.find(s => s.id === id);
    if (!oldSpec) return;
    setState(prev => ({
      ...prev,
      specialties: prev.specialties.map(s => s.id === id ? updated : s),
      clinics: prev.clinics.map(c => ({ ...c, specialties: c.specialties?.map(name => name === oldSpec.name ? updated.name : name) || [] })),
      users: prev.users.map(u => ({ ...u, specialty: u.specialty === oldSpec.name ? updated.name : u.specialty }))
    }));
    await syncUpsert('specialties', updated);
  };

  const addAdvertiser = async (adv: Advertiser) => {
    const newUser: User = { id: Math.random().toString(36).substr(2, 9), name: adv.contactPerson, email: adv.email, password: 'password', role: 'ADVERTISER', advertiserId: adv.id };
    setState(prev => ({ ...prev, advertisers: [...prev.advertisers, adv], users: [...prev.users, newUser] }));
    await Promise.all([
      syncUpsert('advertisers', adv),
      syncUpsert('users', newUser)
    ]);
  };

  const updateAdvertiser = async (adv: Advertiser) => {
    setState(prev => ({ ...prev, advertisers: prev.advertisers.map(a => a.id === adv.id ? adv : a) }));
    await syncUpsert('advertisers', adv);
  };

  const deleteAdvertiser = async (id: string) => {
    setState(prev => ({ ...prev, advertisers: prev.advertisers.filter(a => a.id !== id), videos: prev.videos.filter(v => v.advertiserId !== id), users: prev.users.filter(u => u.advertiserId !== id) }));
    await syncDelete('advertisers', id);
  };

  const addVideo = async (video: AdVideo) => {
    setState(prev => ({ ...prev, videos: [...prev.videos, video] }));
    await syncUpsert('videos', video);
  };

  const recordAdView = async (videoId: string) => {
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;
    const updatedVideo = { ...video, stats: { ...video.stats, views: video.stats.views + 1, lastViewed: Date.now() } };
    setState(prev => ({ ...prev, videos: prev.videos.map(v => v.id === videoId ? updatedVideo : v) }));
    await syncUpsert('videos', updatedVideo);
  };
  
  const addCabin = async (cabin: Cabin) => {
    setState(prev => ({ ...prev, cabins: [...prev.cabins, cabin] }));
    await syncUpsert('cabins', cabin);
  };

  const updateCabin = async (cabin: Cabin) => {
    setState(prev => ({ ...prev, cabins: prev.cabins.map(c => c.id === cabin.id ? cabin : c) }));
    await syncUpsert('cabins', cabin);
  };

  const deleteCabin = async (id: string) => {
    setState(prev => ({ ...prev, cabins: prev.cabins.filter(c => c.id !== id) }));
    await syncDelete('cabins', id);
  };

  const addForm = async (form: RegistrationForm) => {
    setState(prev => ({ ...prev, forms: [...prev.forms, form] }));
    await syncUpsert('forms', form);
  };

  const updateForm = async (form: RegistrationForm) => {
    setState(prev => ({ ...prev, forms: prev.forms.map(f => f.id === form.id ? form : f) }));
    await syncUpsert('forms', form);
  };

  const deleteForm = async (id: string) => {
    setState(prev => ({ ...prev, forms: prev.forms.filter(f => f.id !== id) }));
    await syncDelete('forms', id);
  };
  
  const addGroup = async (group: ClinicGroup) => {
    const formId = Math.random().toString(36).substr(2, 9);
    const formName = group.formTitle || `${group.name} Registration`;
    const allFieldIds = FIELD_OPTIONS.map(f => f.id);
    const newForm: RegistrationForm = { id: formId, name: formName, clinicId: group.clinicId, fields: allFieldIds, qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/register/${formId}`)}` };
    const newGroup = { ...group, formId };
    setState(prev => ({ ...prev, groups: [...prev.groups, newGroup], forms: [...prev.forms, newForm] }));
    await Promise.all([
      syncUpsert('groups', newGroup),
      syncUpsert('forms', newForm)
    ]);
  };

  const updateGroup = async (group: ClinicGroup) => {
    setState(prev => {
      const allFieldIds = FIELD_OPTIONS.map(f => f.id);
      const nextForms = prev.forms.map(f => f.id === group.formId ? { ...f, name: group.formTitle || f.name, fields: allFieldIds } : f);
      return { ...prev, groups: prev.groups.map(g => g.id === group.id ? group : g), forms: nextForms };
    });
    const form = state.forms.find(f => f.id === group.formId);
    await syncUpsert('groups', group);
    if (form) await syncUpsert('forms', { ...form, name: group.formTitle || form.name });
  };

  const deleteGroup = async (id: string) => {
    const group = state.groups.find(g => g.id === id);
    setState(prev => ({ ...prev, groups: prev.groups.filter(g => g.id !== id), forms: prev.forms.filter(f => f.id !== group?.formId) }));
    await syncDelete('groups', id);
    if (group?.formId) await syncDelete('forms', group.formId);
  };
  
  const createToken = (patientName: string, patientData: Record<string, string>, clinicId: string, formId?: string) => {
    const group = state.groups.find(g => g.formId === formId || g.id === patientData['groupId']);
    const groupId = group?.id;
    const existingGroupTokens = state.tokens.filter(t => t.groupId === groupId);
    const newToken: Token = { id: Math.random().toString(36).substr(2, 9), number: existingGroupTokens.length + 101, tokenInitial: group?.tokenInitial, patientName, patientEmail: patientData['email'], patientData, status: 'WAITING', clinicId, groupId, timestamp: Date.now() };
    setState(prev => ({ ...prev, tokens: [...prev.tokens, newToken] }));
    syncUpsert('tokens', newToken);
    return newToken;
  };

  const updateToken = async (token: Token) => {
    setState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === token.id ? token : t) }));
    await syncUpsert('tokens', token);
  };

  const deleteToken = async (id: string) => {
    setState(prev => ({ ...prev, tokens: prev.tokens.filter(t => t.id !== id) }));
    await syncDelete('tokens', id);
  };
  
  const updateTokenStatus = async (tokenId: string, status: Token['status'], cabinId?: string) => {
    let updatedToken: any = null;
    setState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t => {
        if (t.id === tokenId) {
          const updates: Partial<Token> = { status };
          if (cabinId) {
            updates.cabinId = cabinId;
            const cabin = prev.cabins.find(c => c.id === cabinId);
            if (cabin?.currentDoctorId) updates.doctorId = cabin.currentDoctorId;
          }
          if (status === 'CALLING') {
            updates.visitStartTime = t.visitStartTime || Date.now();
            updates.lastRecalledTimestamp = Date.now();
          }
          else if (status === 'COMPLETED' || status === 'CANCELLED') {
            updates.visitEndTime = Date.now();
          }
          updatedToken = { ...t, ...updates };
          return updatedToken;
        }
        return t;
      })
    }));
    if (updatedToken) await syncUpsert('tokens', updatedToken);
  };

  const assignCabinToDoctor = async (cabinId: string, doctorId: string | undefined) => {
    const cabin = state.cabins.find(c => c.id === cabinId);
    if (!cabin) return;
    const updatedCabin = { ...cabin, currentDoctorId: doctorId };
    setState(prev => ({ ...prev, cabins: prev.cabins.map(c => c.id === cabinId ? updatedCabin : c) }));
    await syncUpsert('cabins', updatedCabin);
  };

  if (isLoading) {
    return (
      <div className="vh-100 vw-100 d-flex flex-column align-items-center justify-content-center bg-slate-50">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <div className="h5 fw-black text-indigo-dark text-uppercase tracking-widest">OmniToken Cloud</div>
        <p className="text-muted small">Synchronizing with enterprise backend...</p>
      </div>
    );
  }

  if (registrationView) {
    const clinic = state.clinics.find(c => c.id === registrationView.clinicId);
    let form = state.forms.find(f => f.id === registrationView.formId);
    if (!form && clinic) {
        form = { id: 'clinic-wide', name: `${clinic.name} Patient Portal`, clinicId: clinic.id, fields: ['name', 'phone', 'age', 'gender'], qrCodeUrl: '' };
    }
    if (!form) return null;
    const clinicGroups = state.groups.filter(g => g.clinicId === registrationView.clinicId);

    return (
      <PatientRegistration 
        form={form} 
        groups={clinicGroups}
        onSubmit={(name, data) => {
          const newToken = createToken(name, data, registrationView.clinicId, registrationView.formId);
          setRegistrationView(null);
          // Redirect to home or reset URL to root
          window.history.replaceState({}, '', '/');
          const group = state.groups.find(g => g.formId === form?.id || g.id === data['groupId']);
          const displayToken = `${newToken.tokenInitial ? newToken.tokenInitial + '-' : ''}${newToken.number}`;
          alert(`Success! Your Token for ${group?.name || 'Clinic'} is ${displayToken}`);
        }} 
        onBack={() => {
          setRegistrationView(null);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (!currentUser) return <Login state={state} onLogin={handleLogin} onScanQR={(fId, cId) => setRegistrationView({ formId: fId, clinicId: cId })} />;
  if (currentUser.role === 'SCREEN') return <ScreenDisplay screenUserId={currentUser.id} clinicId={currentUser.clinicId!} state={state} onLogout={handleLogout} onAdView={recordAdView} />;

  return (
    <Layout user={currentUser} onLogout={handleLogout} onUpdateUser={updateUser} activeTab={activeTab} onTabChange={setActiveTab}>
      {currentUser.role === 'CENTRAL_ADMIN' && <CentralAdminDashboard state={state} onAddClinic={addClinic} onDeleteClinic={deleteClinic} onUpdateClinic={updateClinic} onAddAdvertiser={addAdvertiser} onUpdateAdvertiser={updateAdvertiser} onDeleteAdvertiser={deleteAdvertiser} onAddVideo={addVideo} onUpdateToken={updateToken} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} onAddSpecialty={addSpecialty} onDeleteSpecialty={deleteSpecialty} onUpdateSpecialty={updateSpecialty} activeTab={activeTab as any} onTabChange={setActiveTab as any} />}
      {currentUser.role === 'CLINIC_ADMIN' && <ClinicAdminDashboard state={state} user={currentUser} onAddCabin={addCabin} onUpdateCabin={updateCabin} onDeleteCabin={deleteCabin} onAddForm={addForm} onUpdateForm={updateForm} onDeleteForm={deleteForm} onAddGroup={addGroup} onUpdateGroup={updateGroup} onDeleteGroup={deleteGroup} onAddUser={addUser} onDeleteUser={deleteUser} onUpdateUser={updateUser} onUpdateToken={updateToken} onUpdateTokenStatus={updateTokenStatus} onDeleteToken={deleteToken} onUpdateClinic={updateClinic} onCreateToken={createToken} onPreviewForm={(fId, cId) => setRegistrationView({ formId: fId, clinicId: cId })} activeTab={activeTab as any} onTabChange={setActiveTab as any} />}
      {currentUser.role === 'DOCTOR' && <DoctorDashboard state={state} user={currentUser} onUpdateTokenStatus={updateTokenStatus} onUpdateToken={updateToken} onDeleteToken={deleteToken} onCreateToken={createToken} onAssignCabin={assignCabinToDoctor} activeTab={activeTab} onTabChange={setActiveTab} />}
      {currentUser.role === 'ASSISTANT' && <AssistantDashboard state={state} user={currentUser} onUpdateTokenStatus={updateTokenStatus} onUpdateToken={updateToken} onDeleteToken={deleteToken} onCreateToken={createToken} onAssignCabin={assignCabinToDoctor} activeTab={activeTab} />}
      {currentUser.role === 'ADVERTISER' && <AdvertiserDashboard state={state} user={currentUser} onAddVideo={addVideo} activeTab={activeTab} onTabChange={setActiveTab} />}
    </Layout>
  );
};

export default App;
