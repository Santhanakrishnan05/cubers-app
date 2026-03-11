# TESTING GUIDE: Room History & Real-Time Features

## 🔴 CRITICAL TEST 1: Room History Persistence

### Objective
Verify that room history NEVER disappears, even after users leave

### Test Steps

**Step 1: Create a test room**
1. Open browser to `http://localhost:5173`
2. Login as user 1 (Santhana Krishnan J)
3. Click "Create Room"
4. Enter room name: "Test Room History"
5. Click create
6. Verify room is created and active
7. Note the room ID (e.g., "ABC123")

**Step 2: Invite a second user**
1. Open new incognito window
2. Login as user 2 (selva nayagi)
3. Go to Home page
4. Enter the room code from Step 1
5. Click "Join"
6. Verify user 2 sees the active room

**Step 3: Host ends the meeting**
1. In first browser (user 1), click "End Room"
2. Confirm the action
3. Verify both users see "🔴 Room Ended" message
4. Both users should be redirected to Home page

**Step 4: CHECK HISTORY (CRITICAL)**
1. **User 1**: Go to Home page → Check "Your Activity"
   - Should see the room with `isActive = false` and `endTime` populated ✅
   
2. **User 2**: Go to Home page → Check "Your Activity"
   - Should see the room with `isActive = false` and `endTime` populated ✅
   
3. **Refresh page**: User 1 refreshes → Room still appears ✅

4. **Database check**: 
   ```bash
   # Check backend/data.json
   # Find the room by ID - verify:
   # - participants array is INTACT (not empty) ✅
   # - endTime is set
   # - isActive is false
   # - terminatedAt is set
   ```

**Expected Result**: ✅ Room appears in both users' history forever

---

## 🎥 TEST 2: YouTube Host-Only Control

### Objective
Verify only host can control YouTube, participants see read-only view

### Test Steps

**Prerequisites**: Both users in same active room

**Step 1: Host searches and plays**
1. User 1 (host) clicks YouTube button
2. Searches for "How to learn React"
3. Clicks a video
4. Video should play on host screen

**Step 2: Participants see same video**
1. User 2 (participant) opens YouTube in same room
2. Should see same video playing
3. Should NOT have search input enabled (disabled/hidden)
4. Should NOT have play/pause buttons
5. Video should be locked (no seeking)

**Step 3: Participant attempts to search (should fail)**
1. User 2 tries to type in search box
2. Input should be disabled (cannot type)
3. OR input doesn't exist (hidden)

**Step 4: Host seeks and pauses**
1. User 1 pauses video
2. User 2's video should pause immediately
3. User 1 seeks to 1:30
4. User 2's video should jump to 1:30

**Step 5: New participant joins**
1. User 3 joins the room
2. Should see video playing at current host's position
3. Should be at same timestamp as User 1

**Expected Results**:
- ✅ Only host has controls
- ✅ Participants see read-only synchronized view
- ✅ New joiners get current state
- ✅ All users synchronized to server time

---

## 🎨 TEST 3: Whiteboard Host-Only Drawing

### Objective
Verify only host can draw, participants see real-time strokes

### Test Steps

**Prerequisites**: Both users in same active room

**Step 1: Host draws**
1. User 1 (host) clicks Whiteboard button
2. Opens drawing tools (color picker, size selector)
3. Draws a shape (circle, square, line)
4. Stroke appears immediately on host's screen

**Step 2: Participants see stroke instantly**
1. User 2 (participant) has whiteboard open
2. Should see User 1's stroke appear instantly (< 500ms)
3. Should NOT have drawing tools visible
4. Canvas should be read-only

**Step 3: Participant attempts to draw**
1. User 2 clicks on whiteboard canvas
2. Nothing happens (no cursor change)
3. Mouse events don't register (drawing disabled)
4. No strokes appear

**Step 4: Host clears whiteboard**
1. User 1 clicks "Clear"
2. All strokes disappear on host's screen
3. All strokes disappear on User 2's screen (instant)

**Step 5: Host draws again**
1. User 1 draws new strokes
2. Only visible strokes are NEW ones
3. User 2 sees only new strokes (no previous ones)

**Step 6: New participant joins**
1. User 3 joins while whiteboard is active
2. Should see ALL previous strokes drawn by host
3. Should see new strokes as host draws

**Expected Results**:
- ✅ Only host has drawing tools
- ✅ Participants see real-time rendering
- ✅ Strokes broadcast to all instantly
- ✅ Late joiners see full history
- ✅ Clear works for all

---

## ⏱️ TEST 4: Time Synchronization

### Objective
Verify all users see same elapsed time (from server)

### Test Steps

**Prerequisites**: Both users in active room

**Step 1: Check start time**
1. User 1 sees: "Started on: 10:02:30 AM"
2. User 2 sees: "Started on: 10:02:30 AM" (same time)

**Step 2: Compare elapsed times**
1. At T=0 seconds: both see "00:00:00"
2. At T=5 seconds: both see "00:00:05" ± 1 second
3. At T=30 seconds: both see "00:00:30" ± 1 second
4. Elapsed times match within 1 second ✅

**Step 3: User 1 leaves and rejoin**
1. User 1 leaves room (clicks "Leave")
2. User 2 continues (elapsed: "00:01:15")
3. User 1 rejoin (clicks join code)
4. User 1 sees elapsed: "00:01:20" (matches User 2)
5. Time doesn't reset to "00:00:00" ✅

**Step 4: Network latency test**
1. Intentionally add network delay (dev tools → throttle)
2. Elapsed times should still match within 2-3 seconds
3. Both should eventually sync after slow sync

**Expected Results**:
- ✅ Server time is authoritative
- ✅ All users synchronized ± 1 second
- ✅ No clock drift over time
- ✅ Late joiners get correct elapsed time

---

## 💬 TEST 5: Messaging & Document Upload

### Objective
Verify real-time messaging and document persistence

### Test Steps

**Step 1: Send message**
1. User 1 types message in chat: "Hello"
2. Hits enter
3. Message appears on User 1's screen: "You: Hello"
4. Message appears on User 2's screen: "User1: Hello"
5. Timestamp shows current time

**Step 2: Upload document**
1. User 1 clicks upload button
2. Selects a PDF file
3. Document appears in documents section
4. User 2 sees document appear instantly
5. Can click to download

**Step 3: Delete document**
1. User 1 hovers over document
2. Clicks delete (X button)
3. Document disappears on User 1's screen
4. Document disappears on User 2's screen

**Step 4: End room and check history**
1. Host ends room
2. Go to history
3. Messages should be visible ✅
4. Documents should still be there ✅

**Expected Results**:
- ✅ Real-time messaging works
- ✅ Messages persist in history
- ✅ Documents broadcast to all
- ✅ Documents persist in history

---

## 👥 TEST 6: Participant Management

### Objective
Verify participant list is accurate and persistent

### Test Steps

**Step 1: Join sequence**
1. User 1 creates room
2. User 1 sees: "1" participant (self)
3. User 2 joins
4. Both see: "2" participants
5. User 3 joins
6. All see: "3" participants

**Step 2: View participant list**
1. Click "Participants" tab
2. User 1 (Host) ⭐
3. User 2
4. User 3
5. All visible with correct names ✅

**Step 3: User leaves during room**
1. User 3 clicks "Leave"
2. User 1 & 2 see: "2" participants
3. User 3 no longer in list

**Step 4: End room and check history**
1. Host ends room
2. Go to room history
3. Participant count should show full count (all who participated)
4. List shows all 3 users (including User 3 who left) ✅

**Expected Results**:
- ✅ Real-time count updates
- ✅ Late joiners added to list
- ✅ Participant history preserved
- ✅ Never lose participant data

---

## 🔐 TEST 7: Security - Non-Host Restrictions

### Objective
Verify non-hosts cannot perform host actions

### Test Steps

**Step 1: Non-host cannot play YouTube**
1. User 2 (participant) opens browser console
2. Manually emit YouTube event:
   ```javascript
   socket.emit('youtube-play', { roomId: 'ABC123', videoId: 'xyz' });
   ```
3. YouTube doesn't change on any screen
4. Check server log: Should see `SECURITY: Unauthorized action`

**Step 2: Non-host cannot draw**
1. User 2 tries to emit whiteboard event:
   ```javascript
   socket.emit('whiteboard-draw', { roomId: 'ABC123', data: {...} });
   ```
2. Nothing appears on whiteboard
3. Server log shows rejection

**Step 3: Non-host cannot end room**
1. User 2 tries to emit terminate:
   ```javascript
   socket.emit('host-terminate-room', { roomId: 'ABC123' });
   ```
2. Room stays active
3. Server rejects action

**Expected Results**:
- ✅ All host-only commands rejected
- ✅ Server validates on every command
- ✅ Security logs created

---

## 🧪 AUTOMATED TEST: Run All Tests

### Quick Test Script
```bash
# Terminal 1: Start backend
cd backend
npm start
# Should see: ✅ Server running on http://localhost:5000

# Terminal 2: Start frontend
cd cubers-app
npm run dev
# Should see: ✅ Local: http://localhost:5173

# Run tests:
echo "TEST 1: Create room"
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","hostId":1,"hostName":"Host"}'
# Should return room with participants list

echo "TEST 2: Check user history"
curl http://localhost:5000/api/user-room-history/1
# Should return all rooms user participated in

echo "TEST 3: Verify database"
cat backend/data.json | grep -A 5 "participants"
# Should show participants array is intact
```

---

## ✅ PASS/FAIL CRITERIA

### Room History (CRITICAL)
| Test | Expected | Result |
|------|----------|--------|
| Room appears after leaving | YES | ✅/❌ |
| Room appears in history after end | YES | ✅/❌ |
| Participants preserved in history | YES | ✅/❌ |
| Refresh doesn't lose history | YES | ✅/❌ |

### YouTube Control
| Test | Expected | Result |
|------|----------|--------|
| Host can play | YES | ✅/❌ |
| Participants see read-only | YES | ✅/❌ |
| Non-host cannot control | NO | ✅/❌ |
| Late joiner synced | YES | ✅/❌ |

### Whiteboard Control
| Test | Expected | Result |
|------|----------|--------|
| Host can draw | YES | ✅/❌ |
| Participants see in real-time | YES | ✅/❌ |
| Non-host cannot draw | NO | ✅/❌ |
| Late joiner sees history | YES | ✅/❌ |

### Time Sync
| Test | Expected | Result |
|------|----------|--------|
| All see same elapsed time | YES | ✅/❌ |
| Within ±1 second variance | YES | ✅/❌ |
| Server is source of truth | YES | ✅/❌ |

---

## 🐛 Debugging Checklist

If tests fail:

1. **Check server logs**
   ```
   ✅ Should show join-room, user-joined, etc.
   ❌ If empty, Socket.IO not connected
   ```

2. **Check browser console**
   ```
   ❌ Any CORS errors? → Backend CORS config
   ❌ Any socket errors? → Socket.IO connection
   ❌ Any React errors? → Component errors
   ```

3. **Check database**
   ```bash
   cat backend/data.json | python -m json.tool
   # Verify:
   # - Room exists with correct ID
   # - Participants array has all users
   # - Duration is set when room ends
   ```

4. **Test Socket.IO directly**
   ```javascript
   // In browser console:
   socket.emit('join-room', {roomId: 'ABC123', userId: 1, userName: 'Test'});
   socket.on('room-time', (data) => console.log('Received:', data));
   ```

---

## 📊 Success Metrics

After running all tests, you should have:

✅ **Room History**: 100% - rooms never disappear  
✅ **YouTube Control**: 100% - only host controls  
✅ **Whiteboard Control**: 100% - only host draws  
✅ **Time Sync**: ±1 second - all users synchronized  
✅ **Real-time Updates**: < 500ms latency  
✅ **Security**: 100% - non-hosts rejected  
✅ **Persistence**: 100% - nothing lost on refresh  

---

**Test Date**: _________  
**Tester**: _________  
**Result**: ✅ PASS / ❌ FAIL

