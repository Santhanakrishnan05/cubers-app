import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Video, MessageSquare, FileText, Upload, User, Volume2, VolumeX, Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import Whiteboard from '../Whiteboard';
import YouTube from '../YouTube';
import Avatar from '../components/Avatar';

const ActiveRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    selectedRoom,
    setSelectedRoom,
    setData,
    data,
    currentUser,
    currentMessage,
    setCurrentMessage,
    showYouTube,
    setShowYouTube,
    showWhiteboard,
    setShowWhiteboard,
    showParticipants,
    setShowParticipants,
    isMuted: contextMuted,
    setIsMuted: setContextMuted,
    isDeafened: contextDeafened,
    setIsDeafened: setContextDeafened,
    fileInputRefDocuments,
    handleDocumentUpload,
    handleDeleteDocument,
    handleSendMessage,
    handleLeaveRoom,
    handleTerminateRoom
  } = useApp();
  const { socket } = useSocket();
  
  // WebRTC audio
  const {
    isMuted: webrtcMuted,
    isDeafened: webrtcDeafened,
    toggleMute,
    toggleDeafen,
    remoteAudioRef,
    isRecording,
    startRecording,
    stopRecording,
    recordingBlob,
    recordingDuration,
    finalizingRef,
    getRecorderState
  } = useWebRTC(selectedRoom?.id);

  // Auto-start recording when room is active
  const recordingStartedRef = useRef(false);
  const recordingUploadedRef = useRef(false);
  const roomIdRef = useRef(selectedRoom?.id);

  // Keep roomId ref in sync
  useEffect(() => {
    roomIdRef.current = selectedRoom?.id;
  }, [selectedRoom?.id]);

  // Real-time messages state
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Real-time timer state (synchronized)
  const [roomStartTime, setRoomStartTime] = useState(null);
  const [roomStartDisplay, setRoomStartDisplay] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isRoomActive, setIsRoomActive] = useState(true);
  const timerRef = useRef(null);
  const isHostRef = useRef(false);

  // Check if current user is host (compute early)
  const isHost = selectedRoom?.hostId === currentUser?.id;

  // Sync isHostRef with computed value
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Auto-start recording when room is active and user is host
  const recordingRetryRef = useRef(0);
  useEffect(() => {
    if (isRoomActive && selectedRoom && isHost && !recordingStartedRef.current && startRecording) {
      console.log('🎬 Auto-start conditions MET, starting recording...');
      recordingRetryRef.current = 0;

      const tryStartRecording = () => {
        if (recordingStartedRef.current) return;
        recordingRetryRef.current += 1;
        const attempt = recordingRetryRef.current;

        const success = startRecording();
        if (success) {
          recordingStartedRef.current = true;
          recordingUploadedRef.current = false;
          console.log(`🔴 Auto-started recording for room: ${selectedRoom.id} (attempt ${attempt})`);
        } else if (attempt < 5) {
          console.warn(`⚠️ Recording start failed (attempt ${attempt}/5), retrying in 2s...`);
          retryTimerRef.current = setTimeout(tryStartRecording, 2000);
        } else {
          console.error('❌ Failed to start recording after 5 attempts');
        }
      };

      const retryTimerRef = { current: null };
      const initialTimer = setTimeout(tryStartRecording, 2000);
      return () => {
        clearTimeout(initialTimer);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoomActive, selectedRoom?.id, startRecording, isHost]);

  const uploadRecording = async (blobToUpload, durationToUpload) => {
    const currentRoomId = roomIdRef.current || selectedRoom?.id;
    console.log('📤 uploadRecording called:', { currentRoomId, blobSize: blobToUpload?.size, alreadyUploaded: recordingUploadedRef.current });
    if (!currentRoomId || !blobToUpload || recordingUploadedRef.current) {
      console.warn('📤 Skipping upload:', { noRoomId: !currentRoomId, noBlob: !blobToUpload, alreadyUploaded: recordingUploadedRef.current });
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('recording', blobToUpload, `recording-${currentRoomId}.webm`);
      formData.append('roomId', currentRoomId);
      formData.append('duration', durationToUpload || recordingDuration || '0:00:00');

      const response = await fetch('http://localhost:5000/api/upload-recording', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload recording');
      }

      recordingUploadedRef.current = true;
      console.log('✅ Recording uploaded successfully:', result.recording);

      setSelectedRoom(prev => prev ? ({
        ...prev,
        recording: result.recording
      }) : prev);

      setData(prevData => ({
        ...prevData,
        rooms: prevData.rooms.map(room =>
          room.id === currentRoomId
            ? { ...room, recording: result.recording }
            : room
        )
      }));

      return result.recording;
    } catch (err) {
      console.error('Error uploading recording:', err);
      return null;
    }
  };

  const finalizeRecording = async () => {
    const recorderState = getRecorderState();
    console.log('📼 finalizeRecording called:', {
      isHost: isHostRef.current,
      recordingStartedRef: recordingStartedRef.current,
      recordingUploaded: recordingUploadedRef.current,
      recorderState: recorderState,
      isRecordingState: isRecording
    });

    if (!isHostRef.current) {
      console.warn('📼 Skipping finalize: not host');
      return null;
    }
    if (recordingUploadedRef.current) {
      console.warn('📼 Skipping finalize: recording already uploaded');
      return null;
    }

    // Check ACTUAL recorder state instead of relying solely on ref
    const isActuallyRecording = recorderState === 'recording' || recorderState === 'paused';
    if (!recordingStartedRef.current && !isActuallyRecording) {
      console.warn('📼 Skipping finalize: recording was never started and recorder is', recorderState);
      return null;
    }

    // Signal to useWebRTC cleanup that we are finalizing — don't kill recorder/AudioContext
    if (finalizingRef) finalizingRef.current = true;

    try {
      console.log('📼 Calling stopRecording...');
      const result = await stopRecording();
      console.log('📼 stopRecording result:', result ? { blobSize: result.blob?.size, duration: result.duration } : 'null');
      recordingStartedRef.current = false;

      if (result?.blob) {
        console.log('📼 Uploading recording blob, size:', result.blob.size);
        const uploadResult = await uploadRecording(result.blob, result.duration);
        console.log('📼 Upload result:', uploadResult ? 'success' : 'failed');
        return uploadResult;
      }

      console.warn('📼 No blob from stopRecording');
      return null;
    } catch (err) {
      console.error('📼 Error in finalizeRecording:', err);
      return null;
    } finally {
      if (finalizingRef) finalizingRef.current = false;
    }
  };

  // Load room from data if not in selectedRoom (when navigating directly)
  useEffect(() => {
    if (!selectedRoom && roomId && data?.rooms) {
      const foundRoom = data.rooms.find(r => r.id === roomId);
      if (foundRoom) {
        console.log('✅ Loaded room from data:', foundRoom.id);
        setSelectedRoom(foundRoom);
      } else {
        console.warn('❌ Room not found in data, redirecting to home');
        navigate('/home');
      }
    }
  }, [roomId, data?.rooms, selectedRoom, setSelectedRoom, navigate]);

  // Utility functions
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatElapsedTime = (startTime, currentTime) => {
    const diff = Math.floor((currentTime - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Request room state sync on mount
  useEffect(() => {
    if (socket && selectedRoom) {
      socket.emit('sync-room-state', { roomId: selectedRoom.id });
    }
  }, [socket, selectedRoom?.id]);

  // Initialize room start time (synchronized from server)
  useEffect(() => {
    if (selectedRoom) {
      // Get synchronized start time from server
      if (socket && selectedRoom.id) {
        socket.emit('get-room-time', { roomId: selectedRoom.id });
      }
      
      // Fallback to local time if server doesn't respond
      if (!roomStartTime && selectedRoom.startTime) {
        // Parse the start time from room data
        const startDate = new Date(selectedRoom.createdAt || Date.now());
        setRoomStartTime(startDate);
        setRoomStartDisplay(selectedRoom.startTime || formatTime(startDate));
      }
    }
  }, [selectedRoom, socket]);

  // Listen for synchronized room time
  useEffect(() => {
    if (!socket) return;

    const handleRoomTime = ({ startTime, startTimeISO }) => {
      const startDate = new Date(startTimeISO);
      setRoomStartTime(startDate);
      setRoomStartDisplay(startTime);
    };

    const handleElapsedTime = ({ elapsed }) => {
      setElapsedTime(elapsed);
    };

    socket.on('room-time', handleRoomTime);
    socket.on('elapsed-time-update', handleElapsedTime);
    
    return () => {
      socket.off('room-time', handleRoomTime);
      socket.off('elapsed-time-update', handleElapsedTime);
    };
  }, [socket]);

  // Fallback client-side timer (only if server doesn't send updates)
  useEffect(() => {
    if (isRoomActive && roomStartTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        setElapsedTime(formatElapsedTime(roomStartTime, now));
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isRoomActive, roomStartTime]);

  // Handle room termination
  const terminateRoom = async () => {
    if (!roomStartTime) return;

    const endTimeDate = new Date();
    const endTimeFormatted = formatTime(endTimeDate);
    const finalElapsedTime = formatElapsedTime(roomStartTime, endTimeDate);

    setIsRoomActive(false);
    
    // Use functional updater to avoid stale closure overwriting recording data
    setSelectedRoom(prev => prev ? ({
      ...prev,
      endTime: endTimeFormatted,
      duration: finalElapsedTime,
      isActive: false
    }) : prev);
    
    // NOTE: The host-terminate-room socket listener in backend already saves to data.json
    // So we don't need to call handleTerminateRoom API again - it would cause a race condition
    console.log(`Room terminated at ${endTimeFormatted} after ${finalElapsedTime}`);
  };

  // Handle browser tab close (only for host)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isHostRef.current && isRoomActive) {
        terminateRoom();
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? This will end the room for all participants.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRoomActive]);

  // Find and set the selected room based on roomId
  React.useEffect(() => {
    if (roomId && data.rooms) {
      const room = data.rooms.find(r => r.id === roomId);
      if (room) {
        setSelectedRoom(room);
        setMessages(room.messages || []);
      } else {
        navigate('/home');
      }
    }
  }, [roomId, data.rooms, setSelectedRoom, navigate]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!socket || !selectedRoom) return;

    // Handle new messages
    const handleNewMessage = (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      setSelectedRoom(prev => ({
        ...prev,
        messages: [...(prev.messages || []), newMessage]
      }));
    };

    // Handle participant updates
    const handleParticipants = ({ participants: updatedParticipants, count }) => {
      setParticipants(updatedParticipants || []);
      setParticipantCount(count || 0);
      setSelectedRoom(prev => ({
        ...prev,
        participants: updatedParticipants || [],
        participantCount: count || 0
      }));
    };

    // Handle user joined
    const handleUserJoined = ({ userId, userName }) => {
      console.log(`User ${userName} joined the room`);
      // Request updated participant list
      socket.emit('get-participants', { roomId: selectedRoom.id });
    };

    // Handle user left
    const handleUserLeft = ({ userId }) => {
      console.log(`User ${userId} left the room`);
      socket.emit('get-participants', { roomId: selectedRoom.id });
    };

    // Handle room terminated by host
    const handleRoomTerminated = () => {
      // Only non-hosts should handle this event
      // Host already handled termination via terminateRoom() function
      if (!isHostRef.current) {
        setIsRoomActive(false);
        alert('Host has ended the meeting. You will be redirected.');
        setTimeout(() => {
          handleLeaveRoom();
          navigate('/home');
        }, 2000);
      }
    };

    // Handle document uploaded
    const handleDocumentUploaded = ({ document }) => {
      setSelectedRoom(prev => ({
        ...prev,
        documents: [...(prev.documents || []), document]
      }));
    };

    // Handle room state sync
    const handleRoomStateSync = ({ room, participants, documents, messages }) => {
      setSelectedRoom(prev => ({
        ...prev,
        ...room,
        participants: participants || prev.participants,
        documents: documents || prev.documents,
        messages: messages || prev.messages
      }));
      setParticipants(participants || []);
      setMessages(messages || []);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('room-participants', handleParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('room-terminated', handleRoomTerminated);
    socket.on('document-uploaded', handleDocumentUploaded);
    socket.on('room-state-sync', handleRoomStateSync);

    // Request initial participant list
    socket.emit('get-participants', { roomId: selectedRoom.id });

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('room-participants', handleParticipants);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('room-terminated', handleRoomTerminated);
      socket.off('document-uploaded', handleDocumentUploaded);
      socket.off('room-state-sync', handleRoomStateSync);
    };
  }, [socket, selectedRoom]);

  // Real-time send message
  const handleRealTimeSendMessage = () => {
    if (!currentMessage || !selectedRoom || !currentUser || !socket) return;

    socket.emit('send-message', {
      roomId: selectedRoom.id,
      userId: currentUser.id,
      userName: currentUser.name,
      message: currentMessage
    });

    setCurrentMessage('');
  };

  const onLeaveRoom = async () => {
    if (isHostRef.current) {
      // Host is ending the room for everyone
      if (window.confirm('Are you sure you want to end this meeting? All participants will be disconnected.')) {
        console.log('🚪 Host leaving room — starting finalization...');

        // 1. Finalize recording FIRST (stop + upload) — must complete before anything else
        try {
          const recordingResult = await finalizeRecording();
          console.log('🚪 Recording finalized:', recordingResult ? 'uploaded' : 'no recording');
        } catch (err) {
          console.error('🚪 Recording finalization error:', err);
        }

        // 2. Then terminate room
        console.log('🚪 Terminating room...');
        await terminateRoom();

        // 3. Broadcast termination to all participants
        if (socket && selectedRoom) {
          console.log('🚪 Broadcasting host-terminate-room...');
          socket.emit('host-terminate-room', { roomId: selectedRoom.id });
        }

        // 4. Small delay to let the upload network request finish
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Leave and navigate
        console.log('🚪 Navigating to home...');
        handleLeaveRoom();
        navigate('/home');
      }
    } else {
      handleLeaveRoom();
      navigate('/home');
    }
  };

  if (!selectedRoom) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Hidden audio element for remote audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline controls={false} style={{ display: 'none' }} />
      
      {/* Room Status Banner */}
      <div className="flex-1 grid lg:grid-cols-3 gap-2 p-2 overflow-hidden">
        {/* Main Content Area */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 flex flex-col overflow-hidden min-h-0">
          {showYouTube && selectedRoom && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <YouTube onClose={() => setShowYouTube(false)} roomId={selectedRoom.id} />
            </div>
          )}

          {showWhiteboard && (
            <div className="flex-1 flex flex-col relative overflow-hidden z-10">
              <button 
                onClick={() => setShowWhiteboard(false)}
                className="absolute top-6 right-6 z-50 w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center hover:bg-red-600 shadow-lg"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <Whiteboard roomId={selectedRoom.id} />
            </div>
          )}

          {!showYouTube && !showWhiteboard && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4">
              <div className="text-center space-y-4 mb-6">
                <p className="text-slate-400 text-xl">Select a feature to get started</p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => isRoomActive && setShowYouTube(true)}
                    disabled={!isRoomActive}
                    className={`px-6 py-3 rounded-xl flex items-center gap-2 ${
                      isRoomActive 
                        ? 'bg-blue-600 text-white hover:bg-blue-500' 
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                    YouTube
                  </button>
                  <button 
                    onClick={() => isRoomActive && setShowWhiteboard(true)}
                    disabled={!isRoomActive}
                    className={`px-6 py-3 rounded-xl flex items-center gap-2 ${
                      isRoomActive 
                        ? 'bg-green-600 text-white hover:bg-green-500' 
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    Whiteboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Documents Section - Compact at bottom (hidden when whiteboard/youtube is active) */}
          {!showWhiteboard && !showYouTube && (
          <div className="border-t border-slate-700 flex flex-col max-h-40 flex-shrink-0">
            {/* Upload Button - Compact header */}
            <div className="px-4 py-2 bg-slate-800/30 flex-shrink-0 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => isRoomActive && fileInputRefDocuments.current?.click()}
                  disabled={!isRoomActive}
                  className={`p-1.5 rounded-lg flex-shrink-0 ${
                    isRoomActive 
                      ? 'bg-slate-700 hover:bg-slate-600' 
                      : 'bg-slate-800 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Upload className="w-4 h-4 text-white" />
                </button>
                <input
                  ref={fileInputRefDocuments}
                  type="file"
                  hidden
                  onChange={(e) => isRoomActive && handleDocumentUpload(e.target.files?.[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,.gif,.webp"
                />
                <span className={`text-xs flex-shrink-0 ${isRoomActive ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isRoomActive ? 'Documents' : 'Disabled'}
                </span>
                {selectedRoom.documents && selectedRoom.documents.length > 0 && (
                  <span className="text-xs text-blue-400">({selectedRoom.documents.length} files)</span>
                )}
              </div>
            </div>
            
            {/* Documents List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
              <div className="flex flex-wrap gap-2">
              {selectedRoom.documents && selectedRoom.documents.map((doc, idx) => (
                <div 
                  key={idx} 
                  className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs flex items-center gap-2 group relative"
                  title={`${doc.name} - ${doc.size ? (doc.size / 1024).toFixed(2) : '?'} KB`}
                >
                  <FileText className="w-3 h-3" />
                  <a 
                    href={`http://localhost:5000${doc.url}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline cursor-pointer max-w-[120px] truncate"
                  >
                    {doc.name}
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.url, doc.name)}
                    className="p-0.5 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!selectedRoom.documents || selectedRoom.documents.length === 0) && (
                <span className="text-slate-500 text-xs">No documents uploaded</span>
              )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Chat/Participants Sidebar */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">{participantCount || selectedRoom.participantCount || 0}</span>
            </div>
            <button 
              onClick={() => setShowParticipants(!showParticipants)}
              className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center hover:bg-slate-600"
            >
              {showParticipants ? <MessageSquare className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />}
            </button>
          </div>

          {showParticipants ? (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-slate-300 mb-4">Participants ({participantCount || participants.length})</h3>
              <div className="space-y-3">
                {(participants.length > 0 ? participants : selectedRoom.participants || []).map((participant, idx) => (
                  <div key={participant.id || idx} className="flex items-center gap-3">
                    <Avatar src={participant.avatar} size="md" />
                    <span className="text-white">
                      {participant.name} {participant.isHost && <span className="text-yellow-400">*(Host)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                  const isCurrentUser = msg.userId === currentUser?.id;
                  return (
                    <div key={idx} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      {!isCurrentUser && (
                        <Avatar src={msg.avatar} size="md" className="mr-2" />
                      )}
                      <div className={`max-w-[70%] ${isCurrentUser ? 'bg-blue-600' : 'bg-slate-700'} rounded-2xl px-4 py-2`}>
                        {!isCurrentUser && <div className="text-xs text-slate-400 mb-1">{msg.userName}</div>}
                        <p className="text-white">{msg.message}</p>
                      </div>
                      {isCurrentUser && (
                        <Avatar src={currentUser?.avatar} size="md" className="ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isRoomActive ? "Type here..." : "Room has ended..."}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && isRoomActive && handleRealTimeSendMessage()}
                    disabled={!isRoomActive}
                    className={`flex-1 px-4 py-3 rounded-xl text-white border border-slate-700 focus:outline-none ${
                      isRoomActive 
                        ? 'bg-slate-900 placeholder-slate-500 focus:border-blue-400' 
                        : 'bg-slate-800 placeholder-slate-600 cursor-not-allowed'
                    }`}
                  />
                  <button 
                    onClick={handleRealTimeSendMessage}
                    disabled={!isRoomActive}
                    className={`px-6 py-3 rounded-xl font-semibold ${
                      isRoomActive 
                        ? 'bg-blue-600 text-white hover:bg-blue-500' 
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-white font-semibold">Room Name : {selectedRoom.name}</span>
            <div className="flex items-center gap-4 text-slate-300">
              <span>Started on: <span className="text-blue-400 font-mono">{roomStartDisplay}</span></span>
              <span>Elapsed: <span className="text-green-400 font-mono">{elapsedTime}</span></span>
              {isRecording && (
                <span className="text-red-400 font-semibold animate-pulse">● REC</span>
              )}
              {!isRoomActive && (
                <span className="text-red-400 font-semibold">• ROOM ENDED</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Room ID : {selectedRoom.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDeafen}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${webrtcDeafened ? 'bg-red-500' : 'bg-slate-700'} hover:bg-opacity-80`}
              title={webrtcDeafened ? "Unmute Speaker" : "Mute Speaker"}
            >
              {webrtcDeafened ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
            </button>
            <button 
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${webrtcMuted ? 'bg-red-500' : 'bg-slate-700'} hover:bg-opacity-80`}
              title={webrtcMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {webrtcMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            <button 
              onClick={onLeaveRoom}
              className="px-4 py-2 rounded-xl bg-red-500 flex items-center gap-2 hover:bg-red-600 min-w-[120px]"
              title={isHostRef.current ? "End room for everyone" : "Leave room"}
            >
              <PhoneOff className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">
                {isHostRef.current ? "End Room" : "Leave"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveRoom;
