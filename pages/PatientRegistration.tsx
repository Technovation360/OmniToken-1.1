import React, { useState } from 'react';
import { RegistrationForm, ClinicGroup } from '../types';
import { FIELD_OPTIONS } from '../constants';

interface Props {
  form: RegistrationForm;
  // Added groups to fix Prop type error in App.tsx
  groups: ClinicGroup[];
  onSubmit: (name: string, data: Record<string, string>) => void;
  onBack: () => void;
}

const PatientRegistration: React.FC<Props> = ({ form, groups, onSubmit, onBack }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData['name'];
    if (!name) {
      alert("Please enter your name.");
      return;
    }
    // Final check for compulsory gender
    if (form.fields.includes('gender') && !formData['gender']) {
        alert("Please select your gender.");
        return;
    }
    onSubmit(name, formData);
  };

  const renderField = (fId: string) => {
    const field = FIELD_OPTIONS.find(o => o.id === fId);
    const label = field?.label || fId;
    // Name, Phone, Age, and Gender are now compulsory
    const isRequired = ['name', 'phone', 'age', 'gender'].includes(fId);

    if (fId === 'gender') {
      const genders = ['Male', 'Female', 'Other'];
      return (
        <div key={fId} className="mb-4">
          <label className="form-label text-xxs fw-black text-uppercase text-slate-500 tracking-wider mb-2 d-block">
            {label} <span className="text-danger">*</span>
          </label>
          <div className="d-flex flex-wrap gap-2">
            {genders.map(g => (
              <label 
                key={g} 
                className={`border rounded-3 px-3 py-2 text-center cursor-pointer transition-all d-flex align-items-center justify-content-center ${
                  formData[fId] === g 
                    ? 'border-primary bg-primary text-white fw-bold shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-600 hover-bg-slate'
                }`}
                style={{ minWidth: '85px', fontSize: '0.8rem' }}
              >
                <input 
                  type="radio" 
                  name="gender" 
                  value={g} 
                  required={isRequired}
                  checked={formData[fId] === g}
                  onChange={() => setFormData({ ...formData, [fId]: g })}
                  className="d-none"
                />
                {g}
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={fId} className="mb-4">
        <label className="form-label text-xxs fw-black text-uppercase text-slate-500 tracking-wider mb-2 d-block">
          {label} {isRequired ? <span className="text-danger">*</span> : <span className="text-slate-300 normal-case fw-medium">(Optional)</span>}
        </label>
        <input
          required={isRequired}
          type={fId === 'age' ? 'number' : fId === 'phone' ? 'tel' : fId === 'email' ? 'email' : 'text'}
          value={formData[fId] || ''}
          onChange={e => setFormData({ ...formData, [fId]: e.target.value })}
          className="form-control form-control-pro py-3"
          style={{ fontSize: '0.9rem' }}
          placeholder={`Enter your ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <div className="vh-100 bg-white d-flex flex-column overflow-hidden">
      {/* Full Width Header */}
      <header className="bg-primary text-white p-3 p-md-4 flex-shrink-0 shadow-sm">
        <div className="container-md d-flex align-items-center justify-content-between">
          <button 
            onClick={onBack}
            className="btn d-flex align-items-center justify-content-center rounded-circle border-0 shadow-none hover-scale transition-all"
            style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0'
            }}
            title="Go Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          
          <div className="d-flex align-items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              <span style={{ fontSize: '1.2rem' }}>🏥</span>
            </div>
            <div className="text-start">
              <h5 className="fw-black tracking-tight mb-0">{form.name}</h5>
              <p className="text-xxs text-white text-opacity-75 mb-0 fw-bold text-uppercase tracking-widest" style={{fontSize: '0.6rem'}}>Token Registration Portal</p>
            </div>
          </div>
          <div style={{ width: '40px' }} className="d-none d-md-block"></div>
        </div>
      </header>

      {/* Main Form Content Area */}
      <main className="flex-grow-1 overflow-y-auto bg-slate-50 py-4 py-md-5">
        <div className="container-md" style={{ maxWidth: '600px' }}>
          <form onSubmit={handleSubmit} className="bg-white p-4 p-md-5 rounded-4 shadow-sm border border-slate-100">
            <div className="mb-4">
              <h3 className="h5 fw-black text-dark mb-1">Check-in Details</h3>
              <p className="text-muted small mb-0">Fields marked with <span className="text-danger">*</span> are mandatory.</p>
            </div>

            <div className="row">
              {form.fields.map(fId => (
                <div key={fId} className="col-12">
                  {renderField(fId)}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2">
              <button 
                type="submit"
                className="btn btn-primary-pro w-100 py-3 text-uppercase tracking-wider fw-black shadow-lg"
                style={{ fontSize: '0.9rem', borderRadius: '1rem' }}
              >
                Generate My Token
              </button>
              
              <div className="text-center mt-4">
                <div className="d-flex align-items-center justify-content-center gap-2 opacity-50">
                  <div className="bg-success rounded-circle animate-pulse-slow" style={{ width: '8px', height: '8px' }}></div>
                  <span className="text-xxs fw-black text-slate-500 text-uppercase tracking-widest">
                    Digital Check-In Online
                  </span>
                </div>
              </div>
            </div>
          </form>
          
          <div className="text-center mt-4 pb-5 opacity-25">
            <p className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-0">&copy; 2024 OmniToken Enterprise</p>
          </div>
        </div>
      </main>
      
      <style>{`
        .bg-slate-50 { background-color: #f8fafc !important; }
        .animate-pulse-slow { animation: pulse 3s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        
        /* Fix the number input spinners */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
          appearance: textfield;
        }

        .cursor-pointer { cursor: pointer; }
        .hover-bg-slate:hover { background-color: #f8fafc; }
        .hover-scale:hover { transform: scale(1.05); background-color: rgba(255, 255, 255, 0.3) !important; }
        .transition-all { transition: all 0.2s ease; }

        /* Responsive Container */
        .container-md {
          padding-left: 1.25rem;
          padding-right: 1.25rem;
        }

        /* Custom scrollbar for better feel */
        main::-webkit-scrollbar { width: 6px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PatientRegistration;