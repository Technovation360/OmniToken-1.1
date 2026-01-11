
import React, { useState } from 'react';
import { User, AppState } from '../types';
import { loginWithSupabase } from '../services/supabaseService';

interface LoginProps {
  state: AppState;
  onLogin: (user: User) => void;
  onScanQR: (formId: string, clinicId: string) => void;
}

const Login: React.FC<LoginProps> = ({ state, onLogin, onScanQR }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [viewMode, setViewMode] = useState<'staff' | 'patient'>('staff');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      const user = await loginWithSupabase(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Please verify your email and password.');
      }
    } catch (err) {
      setError('A connection error occurred. Please check your network.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Branding Side - Corporate Identity */}
      <div className="bg-indigo-dark text-white p-5 d-flex flex-column branding-side">
        <div className="d-flex align-items-center gap-2 gap-md-3 mb-md-5 pt-md-3">
          <div className="rounded-3 d-flex align-items-center justify-content-center fw-extrabold border border-white border-opacity-20 flex-shrink-0" 
            style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.1)', fontSize: '1rem' }}>O</div>
          <div>
            <h1 className="h5 fw-extrabold mb-0 tracking-tight">OmniToken</h1>
            <p className="mb-0 text-white text-opacity-50 fw-bold text-uppercase hide-on-mobile hide-on-landscape" style={{ fontSize: '0.6rem', letterSpacing: '0.15em' }}>Enterprise Cloud</p>
          </div>
        </div>
        
        <div className="mt-4 mt-md-5">
          <h2 className="display-5 fw-extrabold mb-3 mb-md-4 tracking-tight lh-1">
            Streamline clinic operations.
          </h2>
          <p className="text-white text-opacity-40 fw-medium small hide-on-mobile hide-on-landscape">
            A unified platform for multi-tenant clinic management, dynamic token systems, and smart queue displays.
          </p>
        </div>

        <div className="mt-auto pt-4 hide-on-mobile hide-on-landscape">
          <div className="text-white text-opacity-25 fw-bold tracking-widest text-uppercase" style={{ fontSize: '0.6rem' }}>
            V2.5 Cloud Enterprise
          </div>
        </div>
      </div>

      {/* Form Side - Perfectly Centered, Non-Scrollable */}
      <div className="content-side bg-slate-50 d-flex align-items-center justify-content-center p-3 p-md-4">
        <div className="w-100 animate-fade-in" style={{ maxWidth: '420px' }}>
          <div className="d-flex justify-content-between align-items-end mb-2 mb-md-3 px-1">
            <h3 className="h5 h4-md fw-extrabold mb-0 tracking-tight text-dark">
              {viewMode === 'staff' ? 'Portal Login' : 'Clinic Select'}
            </h3>
            <button 
              onClick={() => setViewMode(viewMode === 'staff' ? 'patient' : 'staff')}
              className="btn btn-link text-primary p-0 text-decoration-none fw-extrabold text-uppercase tracking-widest"
              style={{ fontSize: '0.6rem' }}
            >
              {viewMode === 'staff' ? 'Patient Portal' : 'Staff Login'}
            </button>
          </div>

          <div className="card-pro card p-4 p-md-5 bg-white shadow-lg border-0 rounded-4">
            {viewMode === 'staff' ? (
              <form onSubmit={handleLogin}>
                {error && (
                  <div className="alert alert-danger py-1.5 px-3 text-xxs fw-bold mb-2 text-center border-0 rounded-3">
                    {error}
                  </div>
                )}
                <div className="mb-2 mb-md-4">
                  <label className="text-xxs fw-black text-slate-500 mb-1 d-block text-uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" 
                    required
                    disabled={isLoggingIn}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-control form-control-pro"
                    placeholder="admin@omni.com"
                  />
                </div>
                <div className="mb-3 mb-md-4">
                  <label className="text-xxs fw-black text-slate-500 mb-1 d-block text-uppercase tracking-widest">Password</label>
                  <input 
                    type="password" 
                    required
                    disabled={isLoggingIn}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-control form-control-pro"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn btn-primary-pro w-100 mt-1 mt-md-2 py-2 py-md-3 d-flex align-items-center justify-content-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Authenticating...
                    </>
                  ) : 'Sign in'}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <div className="h3 mb-2 mb-md-3 hide-on-landscape">🏥</div>
                <p className="text-muted small mb-3 mb-md-4">Select a clinic for check-in.</p>
                <div className="list-group list-group-flush border-0 text-start overflow-auto" style={{ maxHeight: '160px' }}>
                  {state.forms.length > 0 ? state.forms.map(form => (
                    <button
                      key={form.id}
                      onClick={() => onScanQR(form.id, form.clinicId)}
                      className="list-group-item list-group-item-action border-0 rounded-3 p-2 p-md-3 mb-2 bg-light d-flex justify-content-between align-items-center"
                    >
                      <div className="overflow-hidden">
                        <div className="fw-extrabold text-dark small text-truncate">{form.name}</div>
                        <div className="text-xxs text-primary fw-bold text-uppercase mt-1 text-truncate">
                          {state.clinics.find(c => c.id === form.clinicId)?.name || 'Clinic Portal'}
                        </div>
                      </div>
                      <span className="text-primary fw-bold ms-2">→</span>
                    </button>
                  )) : (
                    <div className="text-center py-4 text-muted small italic">No active registration portals found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <p className="text-center text-slate-400 text-xxs mt-3 mt-md-5 text-uppercase fw-extrabold tracking-widest opacity-50">
            &copy; 2024 OmniToken
          </p>
        </div>
      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        @media (orientation: landscape) and (max-width: 991px) {
           .display-5 { font-size: 1.4rem !important; }
           .h4-md { font-size: 1rem !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
