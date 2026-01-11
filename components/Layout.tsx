import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (u: User) => void;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onUpdateUser, children, activeTab, onTabChange }) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // User Dropdown and Modal states
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Profile Form States
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '');
  
  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isClinicalsActive = ['clinics', 'specialties', 'patient-details', 'live-queue'].includes(activeTab || '');
  const isAdvertisingActive = ['advertisers', 'videos'].includes(activeTab || '');

  const handleNavClick = (tab: string) => {
    onTabChange?.(tab);
    setIsMobileMenuOpen(false); 
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    onUpdateUser({ ...user, name: profileName, phone: profilePhone, avatar: profileAvatar });
    setShowProfileModal(false);
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (!newPassword) return;
    onUpdateUser({ ...user, password: newPassword });
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
    alert("Password updated successfully");
  };

  const getBreadcrumbs = () => {
    const crumbs = ['Home'];
    if (!activeTab) {
      crumbs.push(user.role.toLowerCase().replace('_', ' '));
      return crumbs;
    }
    const tab = activeTab;
    if (user.role === 'CENTRAL_ADMIN') {
      if (tab === 'insights') crumbs.push('Dashboard');
      else if (tab === 'users') crumbs.push('Accounts');
      else if (['clinics', 'specialties', 'patient-details', 'live-queue'].includes(tab)) {
        crumbs.push('Clinicals');
        if (tab === 'clinics') crumbs.push('Clinics');
        if (tab === 'specialties') crumbs.push('Specialties');
        if (tab === 'patient-details') crumbs.push('Central Register');
        if (tab === 'live-queue') crumbs.push('Live Queue');
      } else if (['advertisers', 'videos'].includes(tab)) {
        crumbs.push('Advertising');
        if (tab === 'advertisers') crumbs.push('Partners');
        if (tab === 'videos') crumbs.push('Ads');
      }
    } else if (user.role === 'CLINIC_ADMIN') {
      if (tab === 'insights') crumbs.push('Analytics');
      else if (tab === 'queue') crumbs.push('Live Queue');
      else if (tab === 'patients') crumbs.push('Patients Register');
      else if (tab === 'cabins') crumbs.push('Stations');
      else if (tab === 'groups') crumbs.push('Groups');
      else if (tab === 'users') crumbs.push('Staff');
      else if (tab === 'settings') crumbs.push('Settings');
    } else if (user.role === 'ASSISTANT' || user.role === 'DOCTOR') {
      if (tab === 'dashboard') crumbs.push('Overview');
      else if (tab === 'consultation') crumbs.push('Consultation');
      else if (tab === 'queue') crumbs.push('Live Queue');
      else if (tab === 'patients') crumbs.push('Patients');
    } else if (user.role === 'ADVERTISER') {
      if (tab === 'stats') crumbs.push('Dashboard');
      else if (tab === 'campaigns') crumbs.push('Campaigns');
      else if (tab === 'gallery') crumbs.push('Video Gallery');
    } else {
      crumbs.push(tab.replace('-', ' '));
    }
    return crumbs;
  };

  const SidebarButton = ({ icon, label, onClick, active, hasSubMenu, isOpen, onToggle }: any) => (
    <div className="mb-0.5 position-relative">
      <button 
        type="button"
        onClick={hasSubMenu ? onToggle : onClick}
        className={`btn w-100 text-start border-0 px-3 py-2 rounded-3 transition-all d-flex align-items-center gap-3 ${
          active ? 'fw-bold' : 'text-slate-500 hover-bg-slate'
        }`}
        style={{ 
          fontSize: '0.8rem',
          backgroundColor: active ? '#f0f7ff' : 'transparent',
          color: active ? '#2563eb' : '#475569'
        }}
      >
        <span style={{ fontSize: '1rem', minWidth: '20px', textAlign: 'center', opacity: active ? 1 : 0.7 }}>{icon}</span>
        <span className="flex-grow-1 text-truncate">{label}</span>
        {hasSubMenu && (
          <span className="ms-auto" style={{ fontSize: '0.55rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', opacity: 0.4 }}>
            ▶
          </span>
        )}
      </button>
    </div>
  );

  const SubButton = ({ label, onClick, active }: any) => (
    <button 
      type="button"
      onClick={onClick}
      className={`btn w-100 text-start border-0 mb-0.5 py-1.5 rounded-3 transition-all d-flex align-items-center ${
        active ? 'fw-bold' : 'text-slate-400 hover-bg-slate'
      }`}
      style={{ 
        fontSize: '0.75rem', 
        paddingLeft: '3.2rem',
        backgroundColor: active ? '#f8fafc' : 'transparent',
        color: active ? '#2563eb' : '#64748b'
      }}
    >
      <span className="flex-grow-1 text-truncate">{label}</span>
    </button>
  );

  return (
    <div className="split-layout">
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      <aside 
        className={`branding-side d-flex flex-column transition-all ${isMobileMenuOpen ? 'show-mobile-menu' : ''}`} 
        style={{ width: isSidebarHidden ? '0px' : undefined }}
      >
        <div className="p-3 p-md-4 d-flex flex-column h-100" style={{ minWidth: '240px' }}>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-extrabold flex-shrink-0 shadow-sm" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>O</div>
              <div>
                <h1 className="h6 fw-extrabold mb-0 tracking-tight text-dark" style={{ fontSize: '0.85rem' }}>OmniToken</h1>
                <p className="mb-0 text-slate-400 fw-bold text-uppercase" style={{ fontSize: '0.45rem', letterSpacing: '0.1em' }}>Enterprise</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-link text-slate-400 p-0 d-lg-none border-0 shadow-none d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <nav className="flex-grow-1 overflow-y-auto px-1 mx-n1">
            <div className="text-slate-300 text-xxs fw-bold mb-3 px-3 tracking-widest text-uppercase">Navigation</div>
            
            {(user.role === 'CENTRAL_ADMIN' || user.role === 'CLINIC_ADMIN') && (
              <SidebarButton icon="📊" label="Dashboard" onClick={() => handleNavClick('insights')} active={activeTab === 'insights'} />
            )}

            {user.role === 'CENTRAL_ADMIN' && (
              <>
                <SidebarButton icon="👥" label="Users" onClick={() => handleNavClick('users')} active={activeTab === 'users'} />
                <SidebarButton 
                  icon="🏥" 
                  label="Clinicals" 
                  hasSubMenu={true} 
                  isOpen={expandedMenu === 'clinicals'} 
                  active={isClinicalsActive}
                  onToggle={() => toggleMenu('clinicals')} 
                />
                {expandedMenu === 'clinicals' && (
                  <div className="animate-fade-in overflow-hidden">
                    <SubButton label="Clinics" onClick={() => handleNavClick('clinics')} active={activeTab === 'clinics'} />
                    <SubButton label="Specialties" onClick={() => handleNavClick('specialties')} active={activeTab === 'specialties'} />
                    <SubButton label="Live Queue" onClick={() => handleNavClick('live-queue')} active={activeTab === 'live-queue'} />
                    <SubButton label="Central Register" onClick={() => handleNavClick('patient-details')} active={activeTab === 'patient-details'} />
                  </div>
                )}
                
                <SidebarButton 
                  icon="🏢" 
                  label="Advertising" 
                  hasSubMenu={true} 
                  isOpen={expandedMenu === 'advertising'} 
                  active={isAdvertisingActive}
                  onToggle={() => toggleMenu('advertising')} 
                />
                {expandedMenu === 'advertising' && (
                  <div className="animate-fade-in overflow-hidden">
                    <SubButton label="Advertisers" onClick={() => handleNavClick('advertisers')} active={activeTab === 'advertisers'} />
                    <SubButton label="Campaigns" onClick={() => handleNavClick('videos')} active={activeTab === 'videos'} />
                  </div>
                )}
              </>
            )}

            {user.role === 'CLINIC_ADMIN' && (
              <>
                <SidebarButton icon="⏱️" label="Live Queue" onClick={() => handleNavClick('queue')} active={activeTab === 'queue'} />
                <SidebarButton icon="👥" label="Patients Register" onClick={() => handleNavClick('patients')} active={activeTab === 'patients'} />
                <SidebarButton icon="🚪" label="Stations" onClick={() => handleNavClick('cabins')} active={activeTab === 'cabins'} />
                <SidebarButton icon="📂" label="Groups" onClick={() => handleNavClick('groups')} active={activeTab === 'groups'} />
                <SidebarButton icon="👩‍⚕️" label="Users" onClick={() => handleNavClick('users')} active={activeTab === 'users'} />
                <SidebarButton icon="⚙️" label="Settings" onClick={() => handleNavClick('settings')} active={activeTab === 'settings'} />
              </>
            )}

            {(user.role === 'DOCTOR' || user.role === 'ASSISTANT') && (
              <>
                <SidebarButton icon="📊" label="Dashboard" onClick={() => handleNavClick('dashboard')} active={activeTab === 'dashboard'} />
                <SidebarButton icon="🩺" label="Consultation" onClick={() => handleNavClick('consultation')} active={activeTab === 'consultation'} />
                <SidebarButton icon="📋" label="Live Queue" onClick={() => handleNavClick('queue')} active={activeTab === 'queue'} />
                <SidebarButton icon="👥" label="Patients" onClick={() => handleNavClick('patients')} active={activeTab === 'patients'} />
              </>
            )}
            
            {user.role === 'ADVERTISER' && (
              <>
                <SidebarButton icon="📊" label="Dashboard" onClick={() => handleNavClick('stats')} active={activeTab === 'stats'} />
                <SidebarButton icon="📋" label="Campaigns" onClick={() => handleNavClick('campaigns')} active={activeTab === 'campaigns'} />
                <SidebarButton icon="🎞️" label="Video Gallery" onClick={() => handleNavClick('gallery')} active={activeTab === 'gallery'} />
              </>
            )}
          </nav>
        </div>
      </aside>

      <main className="content-side bg-slate-50 overflow-hidden h-100">
        <header className="navbar border-bottom px-3 px-md-4 d-flex align-items-center justify-content-between shadow-sm" style={{ height: '60px', flexShrink: 0, backgroundColor: '#4F46E5' }}>
          <div className="d-flex align-items-center gap-4">
            <div className="d-flex align-items-center gap-3">
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(true)} 
                className="btn d-lg-none d-flex align-items-center justify-content-center rounded-circle border-0 shadow-none"
                style={{ width: '38px', height: '38px', padding: '0', backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsSidebarHidden(!isSidebarHidden)} 
                className="btn d-none d-lg-flex align-items-center justify-content-center rounded-circle border-0 shadow-none"
                style={{ width: '32px', height: '32px', padding: '0', backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ transform: isSidebarHidden ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.4s' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
            </div>
            
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0" style={{ fontSize: '0.75rem' }}>
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <li key={idx} className={`breadcrumb-item d-flex align-items-center ${idx === arr.length - 1 ? 'active fw-extrabold text-white' : 'text-white fw-bold'}`}>
                    <span className="text-capitalize text-truncate" style={{maxWidth: '100px'}}>{crumb.replace('-', ' ')}</span>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <div className="d-flex align-items-center gap-3">
             <div className="position-relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="btn p-0 rounded-circle border-0 shadow-sm overflow-hidden d-flex align-items-center justify-content-center"
                  style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold text-white text-uppercase" style={{ fontSize: '0.9rem' }}>
                    {user.avatar ? <img src={user.avatar} className="w-100 h-100 object-fit-cover" alt="User" /> : user.name.charAt(0)}
                  </div>
                </button>

                {isUserDropdownOpen && (
                  <div className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border p-2 animate-fade-in" style={{ width: '220px', zIndex: 1200 }}>
                    <div className="px-3 py-2 border-bottom mb-2">
                      <div className="fw-extrabold text-dark text-truncate" style={{ fontSize: '0.85rem' }}>Hi {user.name}</div>
                      <div className="text-slate-400 text-xxs fw-bold text-uppercase tracking-wider">{user.role.replace('_', ' ')}</div>
                    </div>
                    
                    <button onClick={() => { setIsUserDropdownOpen(false); setShowProfileModal(true); }} className="btn w-100 text-start px-3 py-2 text-slate-600 hover-bg-slate rounded-2 d-flex align-items-center gap-3 mb-1" style={{ fontSize: '0.8rem' }}>
                      <span className="opacity-75">👤</span> User Profile
                    </button>
                    <button onClick={() => { setIsUserDropdownOpen(false); setShowPasswordModal(true); }} className="btn w-100 text-start px-3 py-2 text-slate-600 hover-bg-slate rounded-2 d-flex align-items-center gap-3 mb-1" style={{ fontSize: '0.8rem' }}>
                      <span className="opacity-75">🔑</span> Change Password
                    </button>
                    <div className="border-top my-1"></div>
                    <button onClick={onLogout} className="btn w-100 text-start px-3 py-2 text-danger hover-bg-danger-soft rounded-2 d-flex align-items-center gap-3 mt-1" style={{ fontSize: '0.8rem' }}>
                      <span className="opacity-75">🚪</span> Sign Out
                    </button>
                  </div>
                )}
             </div>
          </div>
        </header>
        <div className="flex-grow-1 overflow-y-auto p-3 p-md-4">
          {children}
        </div>
      </main>

      {/* User Profile Pop-up Form */}
      {showProfileModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1300 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '400px' }}>
             <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
               <h6 className="fw-black mb-0 text-uppercase tracking-tight text-indigo-dark">Update Profile</h6>
               <button onClick={() => setShowProfileModal(false)} className="btn-close-round">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
             </div>
             <div className="p-4">
                <div className="text-center mb-4">
                   <div className="position-relative d-inline-block">
                      <div className="bg-slate-100 rounded-circle overflow-hidden d-flex align-items-center justify-content-center fw-bold text-slate-400" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                         {profileAvatar ? <img src={profileAvatar} className="w-100 h-100 object-fit-cover" alt="Profile" /> : user.name.charAt(0)}
                      </div>
                      <label htmlFor="avatar-upload" className="position-absolute bottom-0 end-0 bg-primary text-white p-1 rounded-circle border border-white cursor-pointer hover-bg-slate" style={{ width: '28px', height: '28px' }}>
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                         <input id="avatar-upload" type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                      </label>
                   </div>
                </div>
                <div className="mb-3">
                  <label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Full Name</label>
                  <input value={profileName} onChange={e => setProfileName(e.target.value)} className="form-control form-control-pro" />
                </div>
                <div className="mb-4">
                  <label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Phone Number</label>
                  <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} className="form-control form-control-pro" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="d-flex gap-2">
                   <button onClick={() => setShowProfileModal(false)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.7rem' }}>Cancel</button>
                   <button onClick={handleSaveProfile} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase">Save Changes</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Change Password Pop-up Form */}
      {showPasswordModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1300 }}>
          <div className="bg-white rounded-4 shadow-lg w-100 mx-3 overflow-hidden animate-fade-in" style={{ maxWidth: '400px' }}>
             <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
               <h6 className="fw-black mb-0 text-uppercase tracking-tight text-indigo-dark">Change Password</h6>
               <button onClick={() => setShowPasswordModal(false)} className="btn-close-round">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
             </div>
             <div className="p-4">
                <div className="mb-3">
                  <label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-control form-control-pro" placeholder="••••••••" />
                </div>
                <div className="mb-4">
                  <label className="text-xxs fw-black text-uppercase text-slate-500 mb-1 d-block">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="form-control form-control-pro" placeholder="••••••••" />
                </div>
                <div className="d-flex gap-2">
                   <button onClick={() => setShowPasswordModal(false)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.7rem' }}>Cancel</button>
                   <button onClick={handleChangePassword} className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase">Update Password</button>
                </div>
             </div>
          </div>
        </div>
      )}
      
      <style>{`
        .hover-bg-slate:hover { background-color: #f8fafc !important; color: #2563eb !important; }
        .hover-bg-danger-soft:hover { background-color: #fef2f2 !important; color: #dc2626 !important; }
        .bg-slate-50 { background-color: #f8fafc !important; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .breadcrumb-item + .breadcrumb-item::before { content: "/"; color: rgba(255,255,255,0.4); font-weight: 400; margin: 0 0.35rem; }
        .transition-all { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .cursor-pointer { cursor: pointer; }
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </div>
  );
};

export default Layout;