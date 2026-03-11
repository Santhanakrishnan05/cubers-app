import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';

const History = () => {
  const navigate = useNavigate();
  const {
    selectedRoom,
    setSelectedRoom,
    setData,
    data
  } = useApp();

  // Audio player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState('0:00:00');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0); // Track actual duration in seconds
  const [audioReady, setAudioReady] = useState(false); // Track if audio metadata is loaded
  const [isSummarizing, setIsSummarizing] = useState(false);
  const pollTimerRef = useRef(null);

  // Parse a duration string like "0:03:07" or "00:03:07" into total seconds
  const parseDurationString = (durStr) => {
    if (!durStr || typeof durStr !== 'string') return 0;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  // Get the reliable duration: prefer browser-reported, fallback to server-stored
  const getReliableDuration = () => {
    // 1. Try browser-reported duration
    if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      return audioRef.current.duration;
    }
    // 2. Try already-set audioDuration (if previously resolved)
    if (audioDuration > 0) {
      return audioDuration;
    }
    // 3. Fallback to server-stored duration string
    if (selectedRoom?.recording?.duration) {
      const parsed = parseDurationString(selectedRoom.recording.duration);
      if (parsed > 0) return parsed;
    }
    return 0;
  };

  // Refresh room data when accessing details page
  useEffect(() => {
    if (selectedRoom) {
      // Fetch fresh room data from backend
      fetch(`http://localhost:5000/api/rooms/${selectedRoom.id}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setSelectedRoom(result.room);
            // Update data with fresh room info
            setData(prevData => ({
              ...prevData,
              rooms: prevData.rooms.map(r => 
                r.id === selectedRoom.id ? result.room : r
              )
            }));
          }
        })
        .catch(err => console.error('Error fetching room data:', err));
    }
  }, [selectedRoom?.id]);

  // Reset audio state when room changes
  useEffect(() => {
    setAudioCurrentTime('0:00:00');
    setAudioProgress(0);
    setIsPlaying(false);
    // Pre-initialize duration from server-stored string so UI shows correct total immediately
    if (selectedRoom?.recording?.duration) {
      const parsed = parseDurationString(selectedRoom.recording.duration);
      setAudioDuration(parsed > 0 ? parsed : 0);
      setAudioReady(parsed > 0);
    } else {
      setAudioDuration(0);
      setAudioReady(false);
    }
  }, [selectedRoom?.id]);

  // Redirect if no room selected (in useEffect to avoid render-time navigation)
  useEffect(() => {
    if (!selectedRoom) {
      navigate('/home');
    }
  }, [selectedRoom, navigate]);

  // Cleanup poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!selectedRoom) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/home')}
              className="bg-orange-500 p-3 rounded-xl hover:bg-orange-600"
            >
              <div className="w-8 h-8 border-2 border-white rounded-lg" />
            </button>
            <h1 className="text-4xl font-bold text-white">Cubers</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="text-white mb-4">
                <h2 className="text-2xl font-bold mb-2">Room: {selectedRoom.name}</h2>
                <div className="text-lg">Room ID: {selectedRoom.id}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 space-y-2">
                <div className="text-slate-300">
                  <span className="text-slate-400">Date:</span> <span className="text-white">{selectedRoom.date}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Start Time:</span> <span className="text-white">{selectedRoom.startTime}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">End Time:</span> <span className="text-white">{selectedRoom.endTime || "Ongoing"}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Duration (Elapsed):</span> <span className="text-green-400 font-mono">{selectedRoom.duration}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <h3 className="text-white font-semibold mb-4">Uploaded Documents</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedRoom.documents && selectedRoom.documents.length > 0 ? (
                  selectedRoom.documents.map((doc, idx) => (
                    <a 
                      key={idx} 
                      href={`http://localhost:5000${doc.url}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 rounded-xl bg-slate-700 text-white text-sm hover:bg-slate-600 transition flex items-center gap-2 group"
                      title={`${doc.name} - ${doc.size ? (doc.size / 1024).toFixed(2) : '?'} KB`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{doc.name}</span>
                      <Download className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition" />
                    </a>
                  ))
                ) : (
                  <div className="col-span-full text-slate-400 text-center py-6">
                    No documents uploaded yet
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <button className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold mb-4">
                Records
              </button>
              {selectedRoom.recording && selectedRoom.recording.url ? (
                <>
                  <audio
                    ref={audioRef}
                    src={`http://localhost:5000${selectedRoom.recording.url}`}
                    preload="auto"
                    onLoadedMetadata={() => {
                      const dur = getReliableDuration();
                      if (dur > 0) {
                        setAudioDuration(dur);
                        setAudioReady(true);
                      }
                    }}
                    onDurationChange={() => {
                      const dur = getReliableDuration();
                      if (dur > 0) {
                        setAudioDuration(dur);
                        setAudioReady(true);
                      }
                    }}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        const cur = audioRef.current.currentTime;
                        const dur = getReliableDuration();
                        // Only update duration state if we got a valid value
                        if (dur > 0) {
                          setAudioDuration(dur);
                          setAudioReady(true);
                        }
                        const h = Math.floor(cur / 3600);
                        const m = Math.floor((cur % 3600) / 60);
                        const s = Math.floor(cur % 60);
                        setAudioCurrentTime(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                        // Use dur for progress; if dur is still 0, don't update progress
                        if (dur > 0) {
                          setAudioProgress(Math.min(100, Math.max(0, (cur / dur) * 100)));
                        }
                      }
                    }}
                    onEnded={() => { setIsPlaying(false); setAudioProgress(100); }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                  />
                  <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl p-4">
                    {/* Play/Pause button */}
                    <button
                      className="w-10 h-10 flex-shrink-0 rounded-full bg-white flex items-center justify-center hover:bg-slate-200 transition"
                      onClick={() => {
                        if (audioRef.current) {
                          if (isPlaying) {
                            audioRef.current.pause();
                          } else {
                            audioRef.current.play().catch(() => {});
                          }
                        }
                      }}
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Time + Seek bar */}
                    <span className="flex-shrink-0 font-mono text-xs text-slate-400 w-14 text-right">{audioCurrentTime}</span>
                    <div
                      className="flex-1 h-2 bg-slate-700 rounded-full cursor-pointer overflow-hidden min-w-0"
                      onClick={(e) => {
                        if (audioRef.current) {
                          const dur = getReliableDuration();
                          if (dur > 0) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const pct = Math.max(0, Math.min(1, x / rect.width));
                            audioRef.current.currentTime = pct * dur;
                          }
                        }
                      }}
                    >
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, audioProgress))}%` }}
                      />
                    </div>
                    <span className="flex-shrink-0 font-mono text-xs text-slate-400 w-14">
                      {audioDuration > 0 
                        ? `${Math.floor(audioDuration / 3600)}:${Math.floor((audioDuration % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')}`
                        : selectedRoom.recording.duration || '0:00:00'
                      }
                    </span>

                    {/* Download button */}
                    <a
                      href={`http://localhost:5000${selectedRoom.recording.url}`}
                      download={`recording-${selectedRoom.id}.webm`}
                      className="w-10 h-10 flex-shrink-0 rounded-full bg-white flex items-center justify-center hover:bg-slate-200 transition"
                    >
                      <Download className="w-5 h-5 text-slate-900" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4 bg-slate-900/50 rounded-xl p-4">
                  <div className="text-slate-400 text-center w-full py-2">
                    No recording available for this session
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <button className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold">
                  Summarization
                </button>
                {!selectedRoom.summary && (
                  <button
                    onClick={async () => {
                      setIsSummarizing(true);
                      try {
                        const response = await fetch(`http://localhost:5000/api/rooms/${selectedRoom.id}/summarize`, {
                          method: 'POST'
                        });
                        const result = await response.json();
                        if (result.success) {
                          if (result.processing) {
                            // AI is processing in background — poll for result
                            let attempts = 0;
                            pollTimerRef.current = setInterval(async () => {
                              attempts++;
                              try {
                                const pollRes = await fetch(`http://localhost:5000/api/rooms/${selectedRoom.id}`);
                                const pollResult = await pollRes.json();
                                if (pollResult.success && pollResult.room.summary && !pollResult.room.summary.includes('Recording not yet uploaded')) {
                                  clearInterval(pollTimerRef.current);
                                  setSelectedRoom(prev => ({ ...prev, summary: pollResult.room.summary }));
                                  setIsSummarizing(false);
                                }
                              } catch (e) { /* ignore polling errors */ }
                              if (attempts > 30) { // 60 second timeout
                                clearInterval(pollTimerRef.current);
                                setIsSummarizing(false);
                              }
                            }, 2000);
                          } else {
                            setSelectedRoom(prev => ({ ...prev, summary: result.summary }));
                            setIsSummarizing(false);
                          }
                        } else {
                          setIsSummarizing(false);
                        }
                      } catch (err) {
                        console.error('Error generating summary:', err);
                        setIsSummarizing(false);
                      }
                    }}
                    disabled={isSummarizing}
                    className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
                  >
                    {isSummarizing ? 'AI Processing...' : 'Generate Summary'}
                  </button>
                )}
              </div>
              <div className="bg-slate-700/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Overview</h3>
                {selectedRoom.summary ? (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedRoom.summary}
                  </p>
                ) : (
                  <p className="text-slate-400 text-center py-4">
                    No summary available yet. Summary is automatically generated when a recording is saved, or click "Generate Summary" to create one.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <h3 className="text-xl font-semibold text-slate-300 mb-4">Participations Names</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {selectedRoom.participants.map((participant, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-white">
                    <Avatar src={participant.avatar} size="md" />
                    <span>{participant.name} {participant.isHost && <span className="text-yellow-400">*(Host)</span>}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <h3 className="text-xl font-semibold text-slate-300 mb-4">Chat Messages</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {selectedRoom.messages && selectedRoom.messages.length > 0 ? (
                  selectedRoom.messages.map((msg, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar src={msg.avatar} size="sm" />
                        <span className="text-blue-400 text-sm font-semibold">{msg.userName}</span>
                        {msg.timestamp && (
                          <span className="text-slate-500 text-xs ml-auto">
                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm pl-9">{msg.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-center py-6">
                    No messages in this session
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/home')}
            className="px-8 py-3 rounded-xl bg-slate-600 text-white font-semibold hover:bg-slate-500"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default History;
