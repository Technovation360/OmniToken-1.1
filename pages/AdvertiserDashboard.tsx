import React, { useState, useRef } from 'react';
import { AppState, User, AdVideo } from '../types';
import { uploadVideoToB2 } from '../services/b2Service';

interface Props {
  state: AppState;
  user: User;
  onAddVideo: (v: AdVideo) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdvertiserDashboard: React.FC<Props> = ({ state, user, onAddVideo, activeTab, onTabChange }) => {
  const advertiserId = user.advertiserId!;
  const advertiser = state.advertisers.find(a => a.id === advertiserId);
  const myAds = state.videos.filter(v => v.advertiserId === advertiserId);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [uploadType, setUploadType] = useState<'youtube' | 'b2'>('youtube');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalViews = myAds.reduce((acc, ad) => acc + ad.stats.views, 0);
  const activeCount = myAds.length;
  
  const estimatedReach = totalViews * 3.5; 

  const handleAddAd = async () => {
    setErrorMessage(null);
    if (!title) {
        setErrorMessage("Please provide a campaign title.");
        return;
    }

    if (uploadType === 'youtube') {
      if (!url) {
        setErrorMessage("Please provide a YouTube URL.");
        return;
      }
      let embedUrl = url;
      if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        const id = url.split('/').pop();
        embedUrl = `https://www.youtube.com/embed/${id}`;
      }

      onAddVideo({
        id: Math.random().toString(36).substr(2, 9),
        title,
        url: embedUrl,
        type: 'youtube',
        advertiserId,
        stats: { views: 0 }
      });
      resetModal();
    } else {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setErrorMessage("Please select a video file to upload.");
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);
        const downloadUrl = await uploadVideoToB2(file, (p) => setUploadProgress(p));
        
        onAddVideo({
          id: Math.random().toString(36).substr(2, 9),
          title,
          url: downloadUrl,
          type: 'b2',
          advertiserId,
          stats: { views: 0 }
        });
        resetModal();
      } catch (err: any) {
        const msg = err.message || "B2 Upload failed.";
        setErrorMessage(msg);
        console.error("Upload Error:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const resetModal = () => {
    setTitle(''); setUrl('');
    setUploadProgress(0);
    setUploading(false);
    setErrorMessage(null);
    setShowAddModal(false);
    onTabChange?.('campaigns');
  };

  return (
    <div className="animate-fade-in">
      {/* Brand Header */}
      <div className="bg-indigo-dark rounded-4 p-4 p-md-5 text-white shadow-lg mb-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
        <div>
          <div className="badge bg-white bg-opacity-20 text-white px-3 py-1 rounded-pill mb-2 text-xxs fw-black text-uppercase tracking-widest border border-white border-opacity-10">Premium Partner</div>
          <h2 className="display-6 fw-black mb-0 tracking-tighter">{advertiser?.companyName}</h2>
          <p className="text-white text-opacity-50 mt-1 fw-bold mb-0">Managed by {user.name}</p>
        </div>
        <div className="d-flex gap-4 text-center text-md-end">
           <div>
              <p className="text-xxs font-black uppercase tracking-widest text-white text-opacity-40 mb-1">Total Impressions</p>
              <div className="h2 fw-black mb-0 tracking-tighter">{totalViews.toLocaleString()}</div>
           </div>
           <div className="vr opacity-20"></div>
           <div>
              <p className="text-xxs font-black uppercase tracking-widest text-white text-opacity-40 mb-1">Active Assets</p>
              <div className="h2 fw-black mb-0 tracking-tighter">{activeCount}</div>
           </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {(activeTab === 'stats' || activeTab === 'insights') && (
          <div className="row g-4 animate-fade-in">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <h6 className="fw-black text-indigo-dark text-uppercase tracking-widest mb-4" style={{ fontSize: '0.7rem' }}>Engagement Summary</h6>
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-end mb-2">
                    <span className="small fw-bold text-slate-500">Video Completion</span>
                    <span className="h5 fw-black text-primary mb-0">78%</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: '8px' }}>
                    <div className="progress-bar bg-primary" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-end mb-2">
                    <span className="small fw-bold text-slate-500">Estimated Reach</span>
                    <span className="h5 fw-black text-success mb-0">{Math.round(estimatedReach).toLocaleString()}</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: '8px' }}>
                    <div className="progress-bar bg-success" style={{ width: '65%' }}></div>
                  </div>
                </div>
                <div className="bg-light p-3 rounded-4 mt-auto">
                  <p className="text-xxs fw-black text-slate-400 text-uppercase tracking-widest mb-1">Top Performing</p>
                  <p className="small fw-bold text-dark mb-0 truncate">{myAds.sort((a,b) => b.stats.views - a.stats.views)[0]?.title || 'None'}</p>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="fw-black text-indigo-dark text-uppercase tracking-widest mb-0" style={{ fontSize: '0.7rem' }}>Recent Performance Chart</h6>
                  <span className="badge bg-light text-slate-500 px-3 py-1 rounded-pill fw-bold text-xxs">Last 30 Days</span>
                </div>
                <div className="d-flex align-items-end gap-2 flex-grow-1" style={{ height: '200px' }}>
                  {[45, 60, 32, 78, 54, 90, 85, 40, 55, 72, 88, 100].map((h, i) => (
                    <div key={i} className="bg-primary bg-opacity-10 rounded-top-2 flex-grow-1 position-relative group-hover-bar" style={{ height: `${h}%` }}>
                      <div className="bar-hover-val text-xxs fw-black text-primary text-center w-100 position-absolute" style={{ top: '-20px', opacity: 0 }}>{h}%</div>
                    </div>
                  ))}
                </div>
                <div className="d-flex justify-content-between mt-3 text-xxs fw-bold text-slate-300 text-uppercase tracking-widest">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>
            </div>

            <div className="col-12">
               <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                 <div className="card-header bg-white py-3 px-4 border-bottom">
                   <h6 className="fw-black text-indigo-dark text-uppercase tracking-widest mb-0" style={{ fontSize: '0.7rem' }}>Active Campaign Distribution</h6>
                 </div>
                 <div className="table-responsive">
                    <table className="table align-middle mb-0" style={{ fontSize: '0.75rem' }}>
                      <thead className="bg-light text-slate-400 fw-black text-uppercase">
                        <tr>
                          <th className="ps-4">Campaign Name</th>
                          <th>Daily Trend</th>
                          <th className="text-center">Total Reach</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myAds.slice(0, 3).map(ad => (
                          <tr key={ad.id}>
                            <td className="ps-4 fw-bold text-dark">{ad.title}</td>
                            <td>
                               <div className="d-flex gap-1">
                                  {[1,2,3,4,5,6].map(i => <div key={i} className="bg-success rounded-pill" style={{ width: '3px', height: `${10 + Math.random() * 20}px` }}></div>)}
                               </div>
                            </td>
                            <td className="text-center fw-black text-primary">{ad.stats.views.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="animate-fade-in">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
               <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                 <h6 className="fw-black text-indigo-dark text-uppercase tracking-widest mb-0" style={{ fontSize: '0.7rem' }}>Campaign Management</h6>
                 <button onClick={() => setShowAddModal(true)} className="btn btn-primary-pro">
                   + New Campaign
                 </button>
               </div>
               <div className="table-responsive">
                 <table className="table table-pro table-hover align-middle mb-0 w-100" style={{ fontSize: '0.75rem' }}>
                    <thead>
                      <tr className="text-nowrap text-slate-500 bg-light bg-opacity-50">
                        <th className="ps-4 py-3">Asset</th>
                        <th>Type</th>
                        <th className="text-center">Views</th>
                        <th className="text-center">Last Interaction</th>
                        <th className="text-center">Status</th>
                        <th className="pe-4 text-end">Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myAds.map(ad => (
                        <tr key={ad.id}>
                          <td className="ps-4 py-3">
                             <div className="d-flex align-items-center gap-3">
                               <div className="bg-dark rounded-3 flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '27px', overflow: 'hidden' }}>
                                 {ad.type === 'youtube' ? (
                                   <iframe src={ad.url} className="w-100 h-100" style={{ pointerEvents: 'none', border: 'none', transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}></iframe>
                                 ) : (
                                   <div className="text-white fw-bold" style={{fontSize: '0.5rem'}}>B2</div>
                                 )}
                               </div>
                               <div className="fw-bold text-dark">{ad.title}</div>
                             </div>
                          </td>
                          <td><span className="badge bg-light text-slate-500 fw-bold border">{ad.type.toUpperCase()}</span></td>
                          <td className="text-center fw-black text-primary">{ad.stats.views.toLocaleString()}</td>
                          <td className="text-center text-muted">{ad.stats.lastViewed ? new Date(ad.stats.lastViewed).toLocaleDateString() : 'Never'}</td>
                          <td className="text-center"><span className="badge bg-success bg-opacity-10 text-success fw-black px-2 py-1 rounded">LIVE</span></td>
                          <td className="pe-4 text-end">
                             <button className="btn btn-sm btn-light rounded-pill px-3 fw-bold text-xxs text-uppercase border">Edit</button>
                          </td>
                        </tr>
                      ))}
                      {myAds.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-5 text-muted italic">No campaigns found. Click "New Campaign" to get started.</td></tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="row g-4 animate-fade-in">
             {myAds.map(ad => (
               <div key={ad.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden h-100 transition-all hover-shadow-lg">
                    <div className="ratio ratio-16x9 bg-dark">
                      {ad.type === 'youtube' ? (
                        <iframe className="w-100 h-100" src={ad.url} title={ad.title} allowFullScreen></iframe>
                      ) : (
                        <video className="w-100 h-100" controls>
                          <source src={ad.url} type="video/mp4" />
                        </video>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-black text-dark mb-0 truncate pe-2" style={{ fontSize: '0.85rem' }}>{ad.title}</h6>
                        <span className={`badge ${ad.type === 'youtube' ? 'bg-danger' : 'bg-primary'} bg-opacity-10 ${ad.type === 'youtube' ? 'text-danger' : 'text-primary'} text-xxs fw-bold px-2 py-1 rounded shadow-none`}>
                          {ad.type === 'youtube' ? 'YouTube' : 'MP4 Cloud'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                         <div className="text-xxs fw-bold text-slate-400 text-uppercase tracking-widest">Added {new Date().toLocaleDateString()}</div>
                         <div className="d-flex align-items-center gap-1">
                           <span className="text-primary fw-black" style={{ fontSize: '0.8rem' }}>{ad.stats.views.toLocaleString()}</span>
                           <span className="text-xxs opacity-25">👁️</span>
                         </div>
                      </div>
                    </div>
                  </div>
               </div>
             ))}
             
             <div className="col-12 col-md-6 col-lg-4">
               <div 
                 className="card border-0 shadow-sm rounded-4 h-100 p-4 d-flex flex-column align-items-center justify-content-center text-center cursor-pointer border-2 border-dashed transition-all hover-border-primary bg-white" 
                 onClick={() => setShowAddModal(true)}
                 style={{ minHeight: '200px' }}
               >
                 <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                   ➕
                 </div>
                 <h6 className="fw-black text-dark mb-1">Add Content</h6>
                 <p className="text-xxs fw-bold text-slate-400 text-uppercase tracking-widest mb-0">Extend Reach</p>
               </div>
             </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1300 }}>
          <div className="bg-white rounded-4 p-4 p-md-5 w-100 mx-3 shadow-lg animate-fade-in" style={{ maxWidth: '480px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-black text-dark mb-0">Launch Campaign</h4>
              {!uploading && (
                <button onClick={() => setShowAddModal(false)} className="btn-close-round">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>
            
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-0 shadow-sm" style={{ fontSize: '0.75rem' }}>
                <div className="fw-black text-uppercase mb-1">Upload Error</div>
                <div className="fw-medium">{errorMessage}</div>
                {uploadType === 'b2' && (
                  <div className="mt-2 text-xxs fw-bold opacity-75 italic border-top pt-2">
                    Note: Direct browser-to-B2 authentication is often blocked by B2's CORS policy. Ensure your B2 bucket has CORS rules allowing this domain.
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xxs fw-black text-slate-500 mb-1 d-block text-uppercase tracking-widest">Campaign Title</label>
              <input 
                disabled={uploading}
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Winter Wellness 2024" 
                className="form-control form-control-pro py-2" 
              />
            </div>

            <div className="mb-4">
              <label className="text-xxs fw-black text-slate-500 mb-1 d-block text-uppercase tracking-widest">Source Type</label>
              <div className="btn-group w-100" role="group">
                <button 
                  type="button" 
                  disabled={uploading}
                  className={`btn btn-sm py-2 fw-bold text-uppercase ${uploadType === 'youtube' ? 'btn-primary' : 'btn-light border text-muted'}`} 
                  onClick={() => setUploadType('youtube')}
                  style={{ fontSize: '0.65rem' }}
                >
                  YouTube Link
                </button>
                <button 
                  type="button" 
                  disabled={uploading}
                  className={`btn btn-sm py-2 fw-bold text-uppercase ${uploadType === 'b2' ? 'btn-primary' : 'btn-light border text-muted'}`} 
                  onClick={() => setUploadType('b2')}
                  style={{ fontSize: '0.65rem' }}
                >
                  Direct Upload (B2)
                </button>
              </div>
            </div>
            
            {uploadType === 'youtube' ? (
              <div className="mb-4">
                <label className="text-xxs fw-black text-slate-500 mb-1 d-block text-uppercase tracking-widest">Video Source (YouTube URL)</label>
                <input 
                  value={url} 
                  onChange={e => setUrl(e.target.value)} 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="form-control form-control-pro py-2" 
                />
                <p className="text-xxs text-muted mt-2 fst-italic">Links will be converted to embed format automatically.</p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-xxs fw-black text-slate-500 mb-1 d-block text-uppercase tracking-widest">Video File (MP4)</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="video/mp4"
                  disabled={uploading}
                  className="form-control form-control-pro py-2" 
                />
                {uploading && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-xxs fw-bold text-primary text-uppercase tracking-widest">Transferring to Backblaze...</span>
                      <span className="text-xxs fw-black text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="progress rounded-pill" style={{ height: '6px' }}>
                      <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              {!uploading && (
                <button onClick={() => setShowAddModal(false)} className="btn btn-light flex-grow-1 fw-bold py-2 rounded-3 text-uppercase border-0 shadow-none" style={{ fontSize: '0.7rem' }}>Cancel</button>
              )}
              <button 
                onClick={handleAddAd} 
                disabled={uploading}
                className="btn btn-primary-pro flex-grow-1 fw-bold shadow-sm py-2 rounded-3 text-uppercase"
              >
                {uploading ? 'Processing...' : 'Launch Assets'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-border-primary:hover { border-color: var(--primary) !important; border-style: solid !important; background-color: #f0f7ff !important; }
        .hover-shadow-lg:hover { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important; transform: translateY(-4px); }
        .transition-all { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .group-hover-bar:hover .bar-hover-val { opacity: 1 !important; transform: translateY(-5px); transition: all 0.2s; }
        .table-pro thead th { background-color: #f8fafc; color: #64748b; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-top: none; }
        .hover-bg-slate:hover { background-color: #f1f5f9; }
      `}</style>
    </div>
  );
};

export default AdvertiserDashboard;
