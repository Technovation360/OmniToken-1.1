
import React, { useState, useEffect, useRef } from 'react';
import { AppState, AdVideo, Token } from '../types';

interface Props {
  screenUserId: string;
  clinicId: string;
  state: AppState;
  onLogout: () => void;
  onAdView: (videoId: string) => void;
}

const ScreenDisplay: React.FC<Props> = ({ screenUserId, clinicId, state, onLogout, onAdView }) => {
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [announcement, setAnnouncement] = useState<Token | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const announcedTimestampsRef = useRef(new Map<string, number>());
  const announcementIntervalRef = useRef<number | null>(null);
  const adCycleRef = useRef<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  const myGroups = state.groups.filter(g => g.screenIds.includes(screenUserId));
  const myGroupIds = myGroups.map(g => g.id);

  const ongoingTokens = state.tokens
    .filter(t => (t.status === 'CALLING' || t.status === 'CONSULTING') && myGroupIds.includes(t.groupId || ''))
    .sort((a, b) => {
      if (a.status === 'CALLING' && b.status !== 'CALLING') return -1;
      if (a.status !== 'CALLING' && b.status === 'CALLING') return 1;
      return b.timestamp - a.timestamp;
    });

  const waitingTokensByGroup = myGroups.reduce((acc, group) => {
    acc[group.id] = state.tokens
      .filter(t => t.groupId === group.id && t.status === 'WAITING')
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 2);
    return acc;
  }, {} as Record<string, Token[]>);

  const videos = state.videos.length > 0 ? state.videos : [];
  const currentVideo = videos[currentVideoIdx];

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
      if (synthRef.current) {
        const voices = synthRef.current.getVoices();
        if (voices.length > 0) setAvailableVoices(voices);
      }
    };
    if (synthRef.current) {
      loadVoices();
      if (synthRef.current.onvoiceschanged !== undefined) synthRef.current.onvoiceschanged = loadVoices;
    }
    const voiceCheckInterval = setInterval(() => {
      if (availableVoices.length === 0) loadVoices();
      else clearInterval(voiceCheckInterval);
    }, 1000);
    return () => {
      clearInterval(voiceCheckInterval);
      if (synthRef.current) synthRef.current.onvoiceschanged = null;
    };
  }, [availableVoices.length]);

  const enableAudio = () => {
    setIsAudioEnabled(true);
    if (synthRef.current) {
      synthRef.current.cancel();
      const welcome = new SpeechSynthesisUtterance("Display system audio active.");
      const preferred = availableVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferred) welcome.voice = preferred;
      welcome.rate = 0.9;
      synthRef.current.speak(welcome);
    }
  };

  // TTS Logic
  useEffect(() => {
    if (!isAudioEnabled) return;

    const cleanupAnnouncements = () => {
      if (announcementIntervalRef.current) {
        clearInterval(announcementIntervalRef.current);
        announcementIntervalRef.current = null;
      }
      if (synthRef.current && synthRef.current.speaking) synthRef.current.cancel();
    };

    let tokenToAnnounce: Token | null = null;
    let latestCallTime = 0;
    const callingTokens = ongoingTokens.filter(t => t.status === 'CALLING');

    for (const token of callingTokens) {
      const callTime = token.lastRecalledTimestamp || token.visitStartTime || 0;
      const lastAnnouncedTime = announcedTimestampsRef.current.get(token.id) || 0;
      if (callTime > lastAnnouncedTime && callTime > latestCallTime) {
        latestCallTime = callTime;
        tokenToAnnounce = token;
      }
    }

    if (tokenToAnnounce) {
      const currentToken = { ...tokenToAnnounce };
      announcedTimestampsRef.current.set(currentToken.id, latestCallTime);
      setAnnouncement(currentToken);

      if (synthRef.current) {
        cleanupAnnouncements();
        const cabin = state.cabins.find(c => c.id === currentToken.cabinId);
        const tokenNumber = `${currentToken.tokenInitial ? currentToken.tokenInitial.split('').join(' ') : ''} ${currentToken.number}`;
        const textToSpeak = `Token number ${tokenNumber}. ${currentToken.patientName}. Please proceed to ${cabin?.name || 'Reception'}.`;
        
        let callCount = 0;
        const speakOnce = () => {
          if (!synthRef.current) return;
          if (callCount >= 3) {
            if (announcementIntervalRef.current) { clearInterval(announcementIntervalRef.current); announcementIntervalRef.current = null; }
            return;
          }
          const checkToken = state.tokens.find(t => t.id === currentToken.id);
          if (!checkToken || checkToken.status !== 'CALLING') {
            if (announcementIntervalRef.current) { clearInterval(announcementIntervalRef.current); announcementIntervalRef.current = null; }
            return;
          }
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          const voices = synthRef.current.getVoices();
          const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google'))) || voices[0];
          if (preferredVoice) utterance.voice = preferredVoice;
          utterance.rate = 0.85;
          if (!synthRef.current.speaking) { synthRef.current.speak(utterance); callCount++; }
        };
        speakOnce();
        announcementIntervalRef.current = window.setInterval(speakOnce, 6000);
      }
      const visualPopupTimer = setTimeout(() => setAnnouncement(null), 15000);
      return () => { clearTimeout(visualPopupTimer); cleanupAnnouncements(); };
    }
  }, [ongoingTokens, state.cabins, isAudioEnabled, state.tokens, availableVoices.length]);

  // Ad Video Cycle
  useEffect(() => {
    if (videos.length === 0) return;

    const cycleNext = () => {
      setCurrentVideoIdx(prev => {
        const next = (prev + 1) % videos.length;
        onAdView(videos[next].id);
        return next;
      });
    };

    onAdView(videos[currentVideoIdx].id);

    // If YouTube, cycle on timer. If B2/Local, cycle on 'ended' event.
    if (currentVideo.type === 'youtube') {
      adCycleRef.current = window.setInterval(cycleNext, 45000);
    }

    return () => { if (adCycleRef.current) clearInterval(adCycleRef.current); };
  }, [videos.length, currentVideoIdx, currentVideo?.type]);

  const handleVideoEnded = () => {
    if (videos.length > 1) {
      setCurrentVideoIdx(prev => (prev + 1) % videos.length);
    }
  };
  
  const clinic = state.clinics.find(c => c.id === clinicId);

  return (
    <div className="vh-100 vw-100 bg-light overflow-hidden d-flex flex-column text-dark font-sans position-relative">
      
      {/* Audio Activation Overlay */}
      {!isAudioEnabled && (
        <div 
          onClick={enableAudio}
          className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{ zIndex: 2000, backgroundColor: 'rgba(37, 99, 235, 0.95)', backdropFilter: 'blur(10px)', cursor: 'pointer' }}
        >
          <div className="text-center text-white p-4">
            <div className="display-1 mb-4">🔊</div>
            <h1 className="fw-black mb-3">Activate Display Audio</h1>
            <p className="h4 opacity-75 mb-5">Click anywhere to enable queue announcements and campaign audio.</p>
            <button className="btn btn-light btn-lg px-5 py-3 rounded-pill fw-black text-primary text-uppercase tracking-widest shadow-lg">
              Start Operations
            </button>
          </div>
        </div>
      )}

      <div className="d-flex flex-grow-1 overflow-hidden h-100">
        {/* Queue Information Section */}
        <div style={{ width: 'clamp(320px, 25vw, 420px)' }} className="d-flex flex-column bg-white border-end shadow-sm h-100 flex-shrink-0">
          <div className="p-4 d-flex align-items-center gap-3 border-bottom flex-shrink-0 bg-light">
             {clinic?.logo ? <img src={clinic.logo} className="rounded-circle" style={{width: '40px', height: '40px', objectFit: 'contain', backgroundColor: 'white', padding: '4px', border: '1px solid #e2e8f0'}} alt="logo" /> : <div className="h4 mb-0">🏥</div>}
             <div>
                <h5 className="fw-black mb-0 text-dark tracking-tight" style={{fontSize: '1.1rem'}}>{clinic?.name || 'Live Queue'}</h5>
                <p className="text-xxs fw-bold text-uppercase text-muted mb-0 tracking-widest">Live Station Status</p>
             </div>
          </div>

          <div className="flex-grow-1 d-flex flex-column overflow-hidden">
            <div className="p-3 border-bottom flex-shrink-0">
              <h6 className="text-xxs fw-black text-uppercase text-muted tracking-widest mb-3">Now Serving</h6>
              {ongoingTokens.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {ongoingTokens.map(token => {
                    const cabin = state.cabins.find(c => c.id === token.cabinId);
                    const isCalling = token.status === 'CALLING';
                    return (
                      <div key={token.id} className={`p-3 rounded-4 transition-all shadow-sm ${isCalling ? 'animate-pulse-bg border-primary border-4' : 'bg-white border'}`}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className={`fw-black ${isCalling ? 'text-white' : 'text-primary'}`} style={{fontSize: '1.2rem'}}>{token.tokenInitial ? `${token.tokenInitial}-` : ''}{token.number}</span>
                          <span className={`badge rounded-pill fw-black text-xxs text-uppercase ${isCalling ? 'bg-white text-primary' : 'bg-info bg-opacity-10 text-info'}`}>{token.status}</span>
                        </div>
                        <div className={`fw-extrabold text-truncate ${isCalling ? 'text-white' : 'text-dark'}`} style={{ fontSize: '1rem' }}>{token.patientName}</div>
                        <div className={`text-xxs fw-black text-uppercase mt-2 d-flex align-items-center gap-1 ${isCalling ? 'text-white text-opacity-75' : 'text-muted'}`}>
                          <span>📍</span> {cabin?.name || '...'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                 <div className="text-center py-5 text-muted">
                   <div className="h1 opacity-25">⏳</div>
                   <p className="small fw-bold text-uppercase tracking-widest">Stations Available</p>
                 </div>
              )}
            </div>

            <div className="p-3 flex-grow-1 overflow-hidden d-flex flex-column">
              <h6 className="text-xxs fw-black text-uppercase text-muted tracking-widest mb-3 flex-shrink-0">Queue Backlog</h6>
              <div className="d-flex flex-column flex-grow-1 gap-3 overflow-y-auto no-scrollbar">
                {myGroups.map(group => {
                  const waiting = waitingTokensByGroup[group.id] || [];
                  return (
                    <div key={group.id} className="p-3 rounded-4 bg-light border border-slate-100">
                      <p className="fw-black text-slate-500 text-uppercase small border-bottom border-slate-200 pb-2 mb-3" style={{fontSize: '0.65rem', letterSpacing: '1px'}}>{group.name}</p>
                      <div className="d-flex flex-row gap-2">
                        {waiting.length > 0 ? waiting.map(token => (
                          <div key={token.id} className="d-flex flex-column justify-content-center align-items-center bg-white p-2 rounded-3 flex-grow-1 shadow-sm border border-white">
                             <span className="fw-black text-primary" style={{fontSize: '1rem'}}>{token.tokenInitial ? `${token.tokenInitial}-` : ''}{token.number}</span>
                             <span className="fw-bold text-muted text-xxs text-truncate w-100 text-center px-1" style={{maxWidth: '120px'}}>{token.patientName}</span>
                          </div>
                        )) : (
                          <div className="w-100 text-center py-2 opacity-50"><span className="text-xxs fw-bold text-muted italic">Queue Clear</span></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Ad Video Section - Integrated Backblaze/Local and YouTube */}
        <div style={{ flex: '1 1 0', position: 'relative', backgroundColor: 'black' }}>
          {currentVideo ? (
            currentVideo.type === 'youtube' ? (
              <iframe 
                className="w-100 h-100 border-0"
                src={`${currentVideo.url}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1`}
                allow="autoplay; encrypted-media"
                title="YouTube Campaign"
              ></iframe>
            ) : (
              <video 
                ref={videoElementRef}
                className="w-100 h-100"
                autoPlay 
                muted 
                playsInline
                onEnded={handleVideoEnded}
                key={currentVideo.url} // Force reload on source change
              >
                <source src={currentVideo.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-indigo-dark text-white">
               <div className="spinner-border text-primary mb-3" role="status"></div>
               <p className="text-white opacity-50 small fw-bold text-uppercase tracking-widest">Connecting to Campaign Cloud...</p>
            </div>
          )}
        </div>
      </div>

      {/* Announcement Popup */}
      {announcement && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-popup-overlay" style={{ zIndex: 100, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(15px)' }}>
          <div className="text-center text-white p-5 rounded-5 animate-popup-content w-100" style={{ maxWidth: '900px' }}>
            <div className="badge bg-primary px-4 py-2 rounded-pill mb-4 fw-black text-uppercase tracking-widest shadow-lg" style={{ fontSize: '1rem' }}>Patient Assignment</div>
            <h1 className="display-1 fw-black mb-1 text-white" style={{ fontSize: '10rem', lineHeight: '1' }}>{announcement.tokenInitial ? `${announcement.tokenInitial}-` : ''}{announcement.number}</h1>
            <h2 className="display-4 fw-bold mb-5 text-white opacity-90">{announcement.patientName}</h2>
            <div className="bg-white p-4 rounded-4 d-inline-block shadow-2xl scale-up-slow">
              <h3 className="h5 fw-black text-slate-400 text-uppercase tracking-widest mb-2">Please proceed to</h3>
              <h3 className="display-5 fw-black text-primary mb-0 mt-1">{state.cabins.find(c => c.id === announcement.cabinId)?.name || 'Reception'}</h3>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-pulse-bg { animation: pulseBg 2s infinite ease-in-out; background-color: #2563eb; color: white; border: none !important; }
        @keyframes pulseBg { 0% { background-color: #3b82f6; transform: scale(1); } 50% { background-color: #2563eb; transform: scale(1.02); } 100% { background-color: #3b82f6; transform: scale(1); } }
        .animate-popup-overlay { animation: fadeInOverlay 0.4s ease-out; }
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        .animate-popup-content { animation: fadeInContent 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67) 0.1s both; }
        @keyframes fadeInContent { from { opacity: 0; transform: scale(0.6) translateY(50px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .scale-up-slow { animation: scaleUp 3s infinite alternate ease-in-out; }
        @keyframes scaleUp { from { transform: scale(1); } to { transform: scale(1.05); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ScreenDisplay;
