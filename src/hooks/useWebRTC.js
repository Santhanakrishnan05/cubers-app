import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useApp } from '../context/AppContext';

export const useWebRTC = (roomId) => {
  const { socket } = useSocket();
  const { currentUser } = useApp();
  const localStreamRef = useRef(null);
  const remoteStreamsRef = useRef(new Map());
  const remoteAudioRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const localStreamReadyRef = useRef(false);
  const pendingOffersRef = useRef([]);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const isDeafenedRef = useRef(false);

  // Recording state
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const stopRecordingResolverRef = useRef(null);
  const finalizingRef = useRef(false);
  const audioContextRef = useRef(null);
  const recordingDestinationRef = useRef(null);
  const sourceNodesRef = useRef(new Map()); // peerId -> MediaStreamSourceNode (recording only)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState('0:00:00');

  // Perfect negotiation: polite/impolite role
  const isPoliteRef = useRef(true);
  const makingOfferRef = useRef(false);

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' }
  ];

  // Keep deafened ref in sync for use in non-reactive callbacks
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);

  // Unlock audio playback on ANY page interaction (catches all user gestures)
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      const audioEl = remoteAudioRef.current;
      if (audioEl && audioEl.srcObject) {
        audioEl.muted = isDeafenedRef.current;
        audioEl.play().catch(() => {});
      }
      document.removeEventListener('click', unlockAudio, true);
      document.removeEventListener('touchstart', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
    };
    document.addEventListener('click', unlockAudio, true);
    document.addEventListener('touchstart', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);
    return () => {
      document.removeEventListener('click', unlockAudio, true);
      document.removeEventListener('touchstart', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
    };
  }, []);

  // Ensure AudioContext is created and running (used for RECORDING only)
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      console.log('🎧 Creating AudioContext (for recording)...');
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      recordingDestinationRef.current = ctx.createMediaStreamDestination();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('🔈 AudioContext resumed');
      }).catch(err => console.warn('AudioContext resume failed:', err));
    }
    return audioContextRef.current;
  }, []);

  // PLAYBACK: Combine all remote streams into one and set on audio element
  // Strategy: Start MUTED (Chrome allows muted autoplay), unmute on first user gesture
  const audioUnlockedRef = useRef(false);

  const updateRemotePlayback = useCallback(() => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;

    const remoteEntries = Array.from(remoteStreamsRef.current.values());
    if (remoteEntries.length === 0) {
      audioEl.srcObject = null;
      return;
    }

    // Combine all remote audio tracks into one MediaStream
    const combined = new MediaStream();
    remoteEntries.forEach(stream => {
      stream.getAudioTracks().forEach(track => {
        if (!combined.getTrackById(track.id)) {
          combined.addTrack(track);
        }
      });
    });

    audioEl.srcObject = combined;
    audioEl.volume = 1.0;

    // If user has already interacted, use their deafen preference.
    // Otherwise start MUTED so play() succeeds (Chrome allows muted autoplay).
    audioEl.muted = audioUnlockedRef.current ? isDeafenedRef.current : true;

    audioEl.play().then(() => {
      console.log('🔊 Remote audio element playing' + (audioUnlockedRef.current ? '' : ' (muted, waiting for gesture)'));
    }).catch(e => {
      console.warn('⚠️ Audio play issue:', e.message);
    });
  }, []);

  // Unlock remote audio playback — MUST be called from a user gesture handler
  const ensureAudioPlaying = useCallback(() => {
    audioUnlockedRef.current = true;
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;
    audioEl.volume = 1.0;
    audioEl.muted = isDeafenedRef.current;
    if (audioEl.srcObject) {
      audioEl.play().then(() => {
        console.log('🔊 Audio unlocked and playing');
      }).catch(e => {
        console.warn('⚠️ Audio unlock play failed:', e.message);
      });
    }
  }, []);

  // Flush buffered ICE candidates once remote description is set
  const flushPendingCandidates = useCallback(async (peerId) => {
    const pc = peerConnectionsRef.current.get(peerId);
    const pending = pendingCandidatesRef.current.get(peerId);
    if (pc && pending && pending.length > 0 && pc.remoteDescription) {
      console.log(`🧊 Flushing ${pending.length} buffered ICE candidates for ${peerId}`);
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding buffered ICE candidate:', err);
        }
      }
      pendingCandidatesRef.current.set(peerId, []);
    }
  }, []);

  // Connect a stream to AudioContext recording destination (for RECORDING only)
  const addStreamToRecordingMix = useCallback((peerId, stream) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
    try {
      const existing = sourceNodesRef.current.get(peerId);
      if (existing) {
        try { existing.disconnect(); } catch (e) { /* ignore */ }
      }

      if (recordingDestinationRef.current) {
        const src = audioContextRef.current.createMediaStreamSource(stream);
        src.connect(recordingDestinationRef.current);
        sourceNodesRef.current.set(peerId, src);
        console.log(`🔗 Stream connected to recording mix: ${peerId}`);
      }
    } catch (err) {
      console.error('Error adding stream to recording mix:', peerId, err);
    }
  }, []);

  // Create a peer connection with all event handlers
  const createPeerConnection = useCallback((peerId) => {
    const existingConnection = peerConnectionsRef.current.get(peerId);
    if (existingConnection && existingConnection.signalingState !== 'closed') {
      return existingConnection;
    }

    console.log(`📞 Creating PeerConnection for peer: ${peerId}`);
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 1
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
        console.log(`  ↗️ Added local track: ${track.kind}, enabled: ${track.enabled}`);
      });
    } else {
      console.warn('  ⚠️ No local stream when creating PC for', peerId);
    }

    pc.ontrack = (event) => {
      // Use the associated stream, or create one from the track as fallback
      const stream = event.streams[0] || new MediaStream([event.track]);
      console.log('🔊 Received remote track from peer:', peerId,
        'kind:', event.track.kind, 'audio tracks:', stream.getAudioTracks().length);
      remoteStreamsRef.current.set(peerId, stream);

      // When remote peer unmutes, re-trigger playback update
      event.track.onunmute = () => {
        console.log('🔊 Remote track active from peer:', peerId);
        updateRemotePlayback();
      };

      // PLAYBACK: Set combined remote streams directly on <audio> element
      updateRemotePlayback();

      // RECORDING: Connect to AudioContext recording destination
      try {
        ensureAudioContext();
        addStreamToRecordingMix(peerId, stream);
      } catch (e) {
        console.warn('Recording mix setup deferred:', e.message);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetSocketId: peerId
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE state [${peerId}]:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log(`✅ ICE connected to ${peerId}`);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔌 Connection state [${peerId}]:`, state);
      if (state === 'connected') {
        console.log(`✅ Peer ${peerId} fully connected!`);
        updateRemotePlayback();
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        const node = sourceNodesRef.current.get(peerId);
        if (node) {
          try { node.disconnect(); } catch (e) { /* ignore */ }
          sourceNodesRef.current.delete(peerId);
        }
        remoteStreamsRef.current.delete(peerId);
        updateRemotePlayback(); // Update audio element after removing peer
        if (state === 'failed') {
          console.warn(`⚠️ Connection to ${peerId} failed, cleaning up`);
          pc.close();
          peerConnectionsRef.current.delete(peerId);
        }
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [socket, roomId, addStreamToRecordingMix, ensureAudioContext, updateRemotePlayback]);

  // Initiate a call to a peer (create and send offer)
  const callPeer = useCallback(async (peerId) => {
    try {
      const existingConnection = peerConnectionsRef.current.get(peerId);
      if (existingConnection && existingConnection.signalingState !== 'closed') {
        console.log(`📞 Already connected to ${peerId} (state: ${existingConnection.signalingState}), skip`);
        return;
      }

      console.log(`📞 Calling peer: ${peerId}`);
      makingOfferRef.current = true;
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { roomId, offer: pc.localDescription, targetSocketId: peerId });
      console.log('📞 Sent offer to peer:', peerId);
    } catch (err) {
      console.error('Error calling peer:', peerId, err);
    } finally {
      makingOfferRef.current = false;
    }
  }, [createPeerConnection, socket, roomId]);

  // Handle an incoming offer — uses "perfect negotiation" pattern
  const handleOfferInternal = useCallback(async (offer, fromSocketId) => {
    try {
      const pc = createPeerConnection(fromSocketId);

      // Perfect negotiation: handle offer collision
      const offerCollision = (pc.signalingState !== 'stable') || makingOfferRef.current;

      if (offerCollision) {
        if (!isPoliteRef.current) {
          // Impolite peer — ignore the colliding offer
          console.log(`🚫 Ignoring colliding offer from ${fromSocketId} (we are impolite)`);
          return;
        }
        // Polite peer — rollback our offer (if needed) and accept the incoming one
        console.log(`🔄 Rolling back to accept offer from ${fromSocketId} (we are polite)`);
        if (pc.signalingState !== 'stable') {
          await pc.setLocalDescription({ type: 'rollback' });
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingCandidates(fromSocketId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { roomId, answer: pc.localDescription, targetSocketId: fromSocketId });
      console.log('📞 Sent answer to peer:', fromSocketId);
    } catch (err) {
      console.error('Error handling offer from:', fromSocketId, err);
    }
  }, [createPeerConnection, flushPendingCandidates, socket, roomId]);

  // Initialize local audio stream
  useEffect(() => {
    console.log('🎧 useWebRTC init effect:', { hasSocket: !!socket, roomId, hasCurrentUser: !!currentUser });
    if (!socket || !roomId || !currentUser) {
      console.log('🎧 Skipping init - missing:', { socket: !!socket, roomId, currentUser: !!currentUser });
      return;
    }
    let cancelled = false;

    // Initialize AudioContext
    ensureAudioContext();

    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      },
      video: false
    })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        console.log('🎤 Got local audio stream, tracks:', stream.getAudioTracks().length);
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach(track => { track.enabled = false; });
        setIsMuted(true);
        localStreamReadyRef.current = true;

        // Add local stream to recording mix (AudioContext — for recording only)
        try {
          ensureAudioContext();
          addStreamToRecordingMix('local', stream);
        } catch (e) {
          console.warn('Recording mix for local stream deferred:', e.message);
        }

        // Process queued offers/calls SEQUENTIALLY to avoid concurrent PeerConnection conflicts
        if (pendingOffersRef.current.length > 0) {
          const pending = [...pendingOffersRef.current];
          pendingOffersRef.current = [];
          console.log(`📬 Processing ${pending.length} queued items sequentially`);

          // If we have both a __callPeer and a received offer for the same peer,
          // skip the __callPeer — we'll answer their offer instead (avoids collision)
          const offeredPeerIds = new Set(
            pending.filter(p => !p.__callPeer).map(p => p.fromSocketId)
          );

          (async () => {
            for (const item of pending) {
              if (item.__callPeer) {
                if (offeredPeerIds.has(item.peerId)) {
                  console.log(`  ⏩ Skipping callPeer for ${item.peerId} — will answer their offer instead`);
                  continue;
                }
                await callPeer(item.peerId);
              } else {
                await handleOfferInternal(item.offer, item.fromSocketId);
              }
            }
          })();
        }
      })
      .catch(err => {
        console.error('❌ Microphone access denied:', err);
      });

    return () => { cancelled = true; };
  }, [socket, roomId, currentUser]);

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    if (!socket || !roomId || !currentUser) return;

    const handleOffer = ({ offer, fromSocketId }) => {
      console.log(`📩 Received offer from ${fromSocketId}, localReady: ${localStreamReadyRef.current}`);
      if (!localStreamReadyRef.current) {
        pendingOffersRef.current.push({ offer, fromSocketId });
        return;
      }
      handleOfferInternal(offer, fromSocketId);
    };

    const handleAnswer = async ({ answer, fromSocketId }) => {
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (!pc) {
        console.warn(`⚠️ No PC for answer from ${fromSocketId}`);
        return;
      }
      try {
        if (pc.signalingState === 'have-local-offer') {
          console.log(`📩 Setting answer from ${fromSocketId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingCandidates(fromSocketId);
        } else {
          console.warn(`⚠️ Got answer but signalingState is ${pc.signalingState}, ignoring`);
        }
      } catch (err) {
        console.error('Error setting answer from:', fromSocketId, err);
      }
    };

    const handleIceCandidate = async ({ candidate, fromSocketId }) => {
      if (!candidate) return;
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        if (!pendingCandidatesRef.current.has(fromSocketId)) {
          pendingCandidatesRef.current.set(fromSocketId, []);
        }
        pendingCandidatesRef.current.get(fromSocketId).push(candidate);
      }
    };

    // We just joined — server tells us who is already in the room
    const handleExistingPeers = ({ peers }) => {
      console.log(`👥 Existing peers in room: [${peers.join(', ')}]`);
      // We are the new joiner → POLITE peer
      isPoliteRef.current = true;

      for (const peerId of peers) {
        // Skip if already connected or already queued for this peer
        if (peerConnectionsRef.current.has(peerId)) {
          console.log(`  Already connected to ${peerId}, skipping`);
          continue;
        }
        const alreadyQueued = pendingOffersRef.current.some(
          p => (p.__callPeer && p.peerId === peerId) || (!p.__callPeer && p.fromSocketId === peerId)
        );
        if (alreadyQueued) {
          console.log(`  Already queued for ${peerId}, skipping`);
          continue;
        }

        if (localStreamReadyRef.current) {
          callPeer(peerId);
        } else {
          pendingOffersRef.current.push({ __callPeer: true, peerId });
        }
      }
    };

    // Someone new joined while we are already here
    // We do NOT initiate a call — the new joiner will call us via handleExistingPeers.
    // This eliminates offer collision entirely.
    const handleNewPeerJoined = ({ peerId }) => {
      console.log('👤 New peer joined:', peerId, '— waiting for their offer');
      isPoliteRef.current = false;
    };

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    socket.on('existing-peers', handleExistingPeers);
    socket.on('new-peer-joined', handleNewPeerJoined);

    // CRITICAL: Re-request existing peers in case we missed the initial event
    // (race condition: SocketContext may emit join-room before these listeners exist)
    console.log('🔄 Requesting existing peers for room:', roomId);
    socket.emit('request-existing-peers', { roomId });

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('existing-peers', handleExistingPeers);
      socket.off('new-peer-joined', handleNewPeerJoined);
    };
  }, [socket, roomId, currentUser, handleOfferInternal, callPeer, flushPendingCandidates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!finalizingRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamReadyRef.current = false;
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      remoteStreamsRef.current.clear();
      pendingCandidatesRef.current.clear();
      pendingOffersRef.current = [];
      sourceNodesRef.current.forEach((node) => {
        try { node.disconnect(); } catch (e) { /* ignore */ }
      });
      sourceNodesRef.current.clear();
      // Clear audio element
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
      if (!finalizingRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        recordingDestinationRef.current = null;
      }
    };
  }, []);

  // --- Recording functions ---
  const startRecording = useCallback(() => {
    console.log('🎤 startRecording called');
    
    // Ensure AudioContext + recording destination exist
    ensureAudioContext();
    
    if (!recordingDestinationRef.current) {
      console.error('❌ Cannot start recording: no recording destination');
      return false;
    }
    recordedChunksRef.current = [];
    setRecordingBlob(null);
    recordingStartTimeRef.current = Date.now();

    try {
      const mixedStream = recordingDestinationRef.current.stream;
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/ogg;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(mixedStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        let result = null;

        if (recordedChunksRef.current.length === 0) {
          console.warn('⚠️ No recorded chunks available');
          setIsRecording(false);
          if (stopRecordingResolverRef.current) {
            stopRecordingResolverRef.current(null);
            stopRecordingResolverRef.current = null;
          }
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'audio/webm' });
        console.log('🎙️ Recording blob created:', blob.size, 'bytes');
        setRecordingBlob(blob);
        let formattedDuration = '0:00:00';

        if (recordingStartTimeRef.current) {
          const durationMs = Date.now() - recordingStartTimeRef.current;
          const totalSec = Math.floor(durationMs / 1000);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          formattedDuration = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          setRecordingDuration(formattedDuration);
        }

        result = {
          blob,
          duration: formattedDuration
        };

        setIsRecording(false);

        if (stopRecordingResolverRef.current) {
          stopRecordingResolverRef.current(result);
          stopRecordingResolverRef.current = null;
        }
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log('🔴 Recording started successfully');
      return true;
    } catch (err) {
      console.error('❌ Error starting recording:', err);
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      stopRecordingResolverRef.current = resolve;
      mediaRecorderRef.current.stop();
      console.log('⏹️ Recording stopped');
    });
  }, []);

  const toggleMute = useCallback(() => {
    ensureAudioContext();
    // Unlock remote audio on this user gesture (ALWAYS, regardless of local stream state)
    ensureAudioPlaying();

    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const newMutedState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
      console.log(newMutedState ? '🔇 Mic muted' : '🎤 Mic unmuted');
    }
  }, [isMuted, ensureAudioContext, ensureAudioPlaying]);

  const toggleDeafen = useCallback(() => {
    ensureAudioContext();

    const newDeafenedState = !isDeafened;
    // Update ref SYNCHRONOUSLY before ensureAudioPlaying reads it
    isDeafenedRef.current = newDeafenedState;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = newDeafenedState;
    }

    // Unlock + play/pause audio on this user gesture
    audioUnlockedRef.current = true;
    if (!newDeafenedState && remoteAudioRef.current?.srcObject) {
      remoteAudioRef.current.play().catch(() => {});
    }

    setIsDeafened(newDeafenedState);
    console.log(newDeafenedState ? '🔇 Speaker muted' : '🔊 Speaker unmuted');
  }, [isDeafened, ensureAudioContext]);

  // Expose recorder state for external checks
  const getRecorderState = useCallback(() => {
    return mediaRecorderRef.current ? mediaRecorderRef.current.state : 'no-recorder';
  }, []);

  return {
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    localStream: localStreamRef.current,
    remoteStreams: remoteStreamsRef.current,
    remoteAudioRef,
    peerConnectionsRef,
    isRecording,
    startRecording,
    stopRecording,
    recordingBlob,
    recordingDuration,
    finalizingRef,
    getRecorderState
  };
};

