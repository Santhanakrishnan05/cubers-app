# Voice Call Testing Checklist

## Pre-Testing Setup
- [ ] Frontend built successfully (completed ✓)
- [ ] Backend running on correct port
- [ ] Two browser windows/tabs ready for testing

## Testing Steps

### 1. Connection Phase
- [ ] Open first browser tab in room
- [ ] Open second browser tab in same room
- [ ] Check console for "✅ Answered WebRTC offer" messages
- [ ] Check console for "✅ Received WebRTC answer" messages
- [ ] **NO errors** about InvalidStateError or OperationError

### 2. ICE Candidate Phase
- [ ] Check console for "✅ Added ICE candidate" messages
- [ ] Should see multiple ICE candidates from both peers
- [ ] Connection state should show "connected"

### 3. Audio Flow Phase
- [ ] Check console for "🎧 Receiving audio track from peer:" 
- [ ] Should see "✅ Added peer audio to mix" messages
- [ ] Should see "✅ Connected mixed audio stream to audio element"

### 4. Microphone Control
- [ ] Click microphone icon on first tab (unmute)
- [ ] Console should show "🎙️ Microphone ✅ ENABLED (Unmuted)"
- [ ] Check that audio track enabled = true
- [ ] **You should hear audio on second tab**

### 5. Multiple Peers (if available)
- [ ] Open a third browser tab in same room
- [ ] All three tabs should have active connections
- [ ] Audio from all peers should be heard
- [ ] Console should show multiple peer connections

### 6. Mute/Unmute Toggle
- [ ] Click microphone to mute
- [ ] Console shows "❌ DISABLED (Muted)"
- [ ] Other tabs should NOT hear audio from muted tab
- [ ] Click again to unmute
- [ ] Audio returns

### 7. Deafen Toggle
- [ ] Click speaker icon to deafen
- [ ] Console shows "🔇 MUTED (Deafened)"
- [ ] Audio element is muted
- [ ] Click again to undeafen
- [ ] Audio returns

### 8. Edge Cases
- [ ] Leave room and rejoin - should reconnect smoothly
- [ ] Refresh page - should reconnect with new peer connection
- [ ] Switch between rooms - old connections should cleanup

## Expected Console Messages (Should see these)

✅ Success Messages:
```
✅ Added peer audio to mix for: [socketId]
✅ Connected mixed audio stream to audio element
✅ Answered WebRTC offer from: [socketId]
✅ Received WebRTC answer from: [socketId]
✅ Added ICE candidate from: [socketId]
🎧 Receiving audio track from peer: [socketId]
```

⚠️ Warning Messages (OK, not critical):
```
⚠️ No local tracks available to add
⚠️ Remote description not set yet - buffering candidate
```

## Red Flags (Should NOT see these)

❌ These indicate the fix didn't work:
```
❌ Error setting remote description: InvalidStateError: Called in wrong state: stable
❌ Error adding ICE candidate: OperationError: Error processing ICE candidate
❌ setRemoteDescription on 'RTCPeerConnection': Failed to set remote answer sdp
```

## Performance Notes

- Initial connection should take 1-2 seconds
- Audio should start within 3-5 seconds
- Mute/unmute should be instant
- No audio lag or echo (handled by browser)

## Troubleshooting

If you still don't hear audio:
1. Check microphone permission is granted (check browser address bar)
2. Verify browser volume is not muted
3. Check that at least one peer has unmuted microphone
4. Verify both tabs are in the same room (check room ID in URL)
5. Check console for any JavaScript errors outside WebRTC

If you see the old errors:
1. Hard refresh page (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Check that latest code is deployed
4. Restart backend server
