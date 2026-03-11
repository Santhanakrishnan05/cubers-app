# CUBERS - Real-Time Collaborative Learning Platform
## System Architecture & Implementation Guide

**Last Updated:** January 24, 2026  
**Status:** Room history persistence FIXED ✅

---

## 🔴 CRITICAL BUG FIX: Room History Disappearing

### Root Cause Analysis
The room history was disappearing due to three issues:

1. **Participants Removal on Leave**: When users left a room, they were being completely removed from the `participants` array in the database
2. **Filtering Logic**: Rooms were only shown to users who were currently in the `participants` array - if removed, the room disappeared from history
3. **No Room History Concept**: There was no distinction between active rooms and completed rooms in the data model

### Solution Implemented

#### Backend Changes (server.js)

```javascript
// CRITICAL: Do NOT remove participants from rooms - preserve history
socket.on('leave-room', ({ roomId, userId }) => {
  // Only update socket tracking, NOT the database participants array
  // This ensures room history is preserved forever
  if (!room.isActive && room.endTime) {
    // Room already ended - don't modify anything
  } else {
    // Room still active - update tracking but keep participants in DB
  }
});

// When terminating a room, save final state
app.put('/api/rooms/terminate', (req, res) => {
  room.endTime = endTime;
  room.duration = duration; // Actual elapsed time
  room.isActive = false;
  room.terminatedAt = new Date().toISOString();
  // KEEP participants array intact
  writeDataFile(data);
});
```

#### Frontend Changes (AppContext.jsx)

```javascript
// Sort rooms: active first, then by most recent
const sortedFilteredRooms = filteredRooms.sort((a, b) => {
  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1;
  }
  // Most recent first
  const aTime = new Date(a.actualStartTime || a.createdAt || 0).getTime();
  const bTime = new Date(b.actualStartTime || b.createdAt || 0).getTime();
  return bTime - aTime;
});

// Fetch only rooms user participated in
useEffect(() => {
  fetch(`http://localhost:5000/api/user-room-history/${currentUser.id}`)
    .then(res => res.json())
    .then(result => {
      setData(prev => ({
        ...prev,
        rooms: result.rooms // Always use backend as source of truth
      }));
    });
}, [currentUser]);
```

### Guarantees
✅ Room history is NEVER deleted unless explicitly deleted by host  
✅ Participants are preserved forever in room history  
✅ Backend is the single source of truth  
✅ Frontend refetches every 5 seconds  

---

## 📐 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   AppContext     │  │  SocketContext   │  │   useWebRTC  │  │
│  │  (Global State)  │  │  (Real-time)     │  │  (Voice)     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                      │                    │           │
│  ┌────────▼──────────────────────▼────────────────────▼────────┐ │
│  │                    React Components                          │ │
│  │  Home.jsx ─ ActiveRoom.jsx ─ YouTube.jsx ─ Whiteboard.jsx   │ │
│  └───────────────────────────────────────────────────────────── │
│                                                                   │
└───────────┬───────────────────────────┬──────────────────────────┘
            │                           │
   HTTP (REST API)                Socket.IO (Real-time)
            │                           │
┌───────────▼───────────────────────────▼──────────────────────────┐
│                    NODE.JS BACKEND (server.js)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  REST API    │  │  Socket.IO   │  │   Room State Store   │   │
│  │  Endpoints   │  │  Handlers    │  │  (YouTube, WB, etc)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  data.json (Persistent Storage)                          │   │
│  │  - users: User accounts                                  │   │
│  │  - rooms: All rooms (active + completed) with full       │   │
│  │    participant history                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  uploads/ Directory                                       │   │
│  │  - Avatar images                                         │   │
│  │  - Shared documents (PDFs, images, etc)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Data Model

### Room Object
```javascript
{
  id: "ABC123",                          // 6-char alphanumeric
  name: "Mathematics Class",             // Room name
  hostId: 1,                             // User ID of host
  
  // Timing Information
  startTime: "10:02:12 AM",              // Display format
  actualStartTime: "2026-01-24T...",     // ISO format (server time)
  createdAt: "2026-01-24T...",           // Backup start time
  endTime: "11:34:45 AM",                // Set when host ends meeting
  actualEndTime: "2026-01-24T...",       // ISO format
  duration: "01:32:33",                  // Actual elapsed time
  terminatedAt: "2026-01-24T...",        // ISO format
  
  // Participants (NEVER REMOVED)
  participants: [
    { id: 1, name: "Host Name", isHost: true },
    { id: 2, name: "Student 1", isHost: false },
    { id: 3, name: "Student 2", isHost: false }
  ],
  participantCount: 3,
  
  // Status
  isActive: true,                        // false when host ends meeting
  
  // Shared Content
  messages: [
    { id: 1, userId: 1, userName: "Host", message: "...", timestamp: "..." }
  ],
  documents: [
    { name: "file.pdf", type: "pdf", url: "/uploads/...", size: 1024 }
  ],
  
  // Recording (future feature)
  recording: { duration: "1:02:43", currentTime: "0:16:13" },
  
  // Summary (generated after meeting)
  summary: ""
}
```

### User Object
```javascript
{
  id: 1,                                 // Auto-increment
  name: "John Doe",
  email: "john@example.com",
  phone: "+91 XXXXXXXXXX",
  password: "hashed",                    // In production, use bcrypt
  avatar: "http://localhost:5000/uploads/...",
  createdAt: "2026-01-24"
}
```

---

## 🔌 Socket.IO Event Flow

### Room Lifecycle

#### 1. User Joins Room
```
CLIENT                          BACKEND
  │
  ├─ join-room                    │
  │  { roomId, userId, userName } │
  │──────────────────────────────>│
  │                               ├─ Add to roomUsers Map
  │                               ├─ Update DB: add to participants
  │                               ├─ Send room-time
  │                               ├─ Send youtube-sync (if any)
  │ room-time                     │
  │ { startTime, startTimeISO }   │
  │<──────────────────────────────┤
  │                               │
  │ elapsed-time-update           │
  │ { elapsed: "00:05:30" }       │
  │<──────────────────────────────┤
  │                               │
  │ youtube-sync (optional)       │
  │ { videoId, currentTime, ... } │
  │<──────────────────────────────┤
  │
  └─ Now synchronized with server time!
```

#### 2. Host Controls YouTube
```
HOST (only)                     BACKEND
  │
  ├─ youtube-play                │
  │  { roomId, videoId,          │
  │    currentTime }             │
  │──────────────────────────────>│
  │                               ├─ Verify host is sender
  │                               ├─ Store state in roomState
  │                               ├─ Broadcast to ALL in room
  │
  │ Broadcast to all participants:
  │                               │
  │                    youtube-play
  │                    { videoId, currentTime }
  │<──────────────────────────────┤
```

#### 3. Host Controls Whiteboard
```
HOST (only)                     BACKEND
  │
  ├─ whiteboard-draw              │
  │  { roomId, data:              │
  │    { x, y, color, ... } }    │
  │──────────────────────────────>│
  │                               ├─ Verify host is sender
  │                               ├─ Store stroke in whiteboard state
  │                               ├─ Broadcast to ALL
  │
  │ Broadcast to all:
  │                               │
  │                  whiteboard-draw { stroke data }
  │<──────────────────────────────┤
  │
  └─ ALL participants see the stroke INSTANTLY
```

#### 4. Message Broadcasting
```
ANY PARTICIPANT               BACKEND
  │
  ├─ send-message              │
  │  { roomId, userId,         │
  │    userName, message }     │
  │────────────────────────────>│
  │                             ├─ Save to DB
  │                             ├─ Broadcast new-message
  │
  │                  new-message
  │<────────────────────────────┤
  │
  └─ ALL participants receive
```

#### 5. Room Termination (Host Only)
```
HOST (only)                    BACKEND
  │
  ├─ host-terminate-room       │
  │  { roomId }                │
  │───────────────────────────>│
  │                            ├─ Verify host
  │                            ├─ Set isActive = false
  │                            ├─ Record endTime & duration
  │                            ├─ Clear room state
  │                            ├─ Broadcast room-terminated
  │
  │              room-terminated
  │<───────────────────────────┤
  │
  ├─ All participants redirected to Home
  ├─ Room history is preserved forever
  └─ No further actions allowed
```

---

## 👥 Role-Based Access Control

### Host Permissions
✅ Start meeting (creates room)  
✅ End meeting for everyone (broadcast room-terminated)  
✅ **ONLY**: Select & play YouTube videos  
✅ **ONLY**: Pause YouTube  
✅ **ONLY**: Seek YouTube  
✅ **ONLY**: Draw on whiteboard  
✅ **ONLY**: Clear whiteboard  
✅ Upload documents  
✅ Send messages  
✅ Mute/Unmute microphone  
✅ Mute/Unmute speakers  

### Participant Permissions
✅ Join existing rooms  
✅ View YouTube (read-only, host controls)  
✅ View whiteboard (read-only, host draws)  
✅ Download/view documents  
✅ Send messages  
✅ Mute/Unmute microphone  
✅ Mute/Unmute speakers  
❌ Control YouTube  
❌ Draw on whiteboard  
❌ Modify documents  
❌ End meeting  

### Implementation (server.js)
```javascript
socket.on('youtube-play', ({ roomId, videoId, currentTime }) => {
  const userId = socketToUser.get(socket.id);
  const room = data.rooms.find(r => r.id === roomId);
  
  // ENFORCE: Only host can play
  if (room && room.hostId === userId) {
    // Store and broadcast
    io.to(roomId).emit('youtube-play', { videoId, currentTime });
  } else {
    console.log(`REJECTED: Non-host user ${userId} tried to play YouTube`);
  }
});
```

---

## ⏱️ Time Synchronization Architecture

### Problem
- Clients have different clocks
- Using client time causes desync (one user sees 10:05:30, another sees 10:05:45)
- Meeting duration calculation becomes incorrect

### Solution: Server-Authoritative Time

#### On Room Creation
```javascript
// server.js
const newRoom = {
  startTime: now.toLocaleTimeString(...),          // For display
  actualStartTime: now.toISOString(),              // Server ISO time - AUTHORITATIVE
  createdAt: now.toISOString()                     // Backup
};
```

#### When User Joins
```javascript
socket.on('join-room', ({ roomId, userId, userName }) => {
  const room = data.rooms.find(r => r.id === roomId);
  
  // Send server time to client
  const startTimeISO = room.actualStartTime || room.createdAt;
  socket.emit('room-time', {
    startTime: room.startTime,        // "10:02:12 AM"
    startTimeISO: startTimeISO        // ISO for calculation
  });
  
  // Send CALCULATED elapsed time
  const elapsed = calculateElapsedTime(startTimeISO);
  socket.emit('elapsed-time-update', { elapsed: "00:00:15" });
});
```

#### Every Second (Server Broadcasting)
```javascript
// Every 1000ms, server recalculates and broadcasts
setInterval(() => {
  data.rooms.forEach(room => {
    if (!room.endTime && room.actualStartTime) {
      const elapsed = calculateElapsedTime(room.actualStartTime);
      io.to(room.id).emit('elapsed-time-update', { elapsed });
    }
  });
}, 1000);
```

#### Client Implementation (ActiveRoom.jsx)
```javascript
// Listen for server time sync
socket.on('room-time', ({ startTime, startTimeISO }) => {
  const startDate = new Date(startTimeISO);
  setRoomStartTime(startDate);           // Server authoritative
  setRoomStartDisplay(startTime);
});

// Listen for elapsed time updates
socket.on('elapsed-time-update', ({ elapsed }) => {
  setElapsedTime(elapsed);               // Server calculated
});
```

### Guarantees
✅ All users see the SAME elapsed time (from server)  
✅ Duration is calculated from server time  
✅ No clock skew or drift  
✅ Client fallback timer works if server updates slow  

---

## 🎥 YouTube Implementation (Host-Only Control)

### Architecture
```
┌──────────────────────────────────────────────────┐
│ YouTube Component (Client)                       │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─ If User is HOST:                            │
│  │  ├─ Search input enabled                     │
│  │  ├─ Play/Pause buttons enabled               │
│  │  └─ Seek bar enabled                         │
│  │                                               │
│  └─ If User is PARTICIPANT:                     │
│     ├─ Search input DISABLED                    │
│     ├─ Video LOCKED (controls hidden)           │
│     ├─ Synced to host's current position        │
│     └─ Auto-scrolls to host's seek position     │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Event Flow
```
HOST searches and clicks play:

Client: youtube-play
  { roomId, videoId, currentTime: 0 }
  ──────────────────────────────────────> Server validates host

Server broadcasts youtube-play:
  ─────────────────────────────────────────> ALL participants receive
  
Participants' video:
  - Load videoId in iframe
  - Scroll to currentTime: 0
  - Start playing
  - Block all user interaction
```

### Handling Late Joiners
When a new participant joins:
```javascript
socket.on('join-room', ({ roomId }) => {
  // Send current YouTube state
  if (roomState.has(roomId) && roomState.get(roomId).youtube) {
    const youtubeState = roomState.get(roomId).youtube;
    socket.emit('youtube-sync', youtubeState);
    // Late joiner gets: { videoId, currentTime, isPlaying }
    // So they jump to correct position
  }
});
```

---

## 🎨 Whiteboard Implementation (Host-Only Drawing)

### Architecture
```
┌──────────────────────────────────────────────────┐
│ Whiteboard Component (HTML5 Canvas)              │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─ If User is HOST:                            │
│  │  ├─ Canvas mouse events ENABLED              │
│  │  ├─ Draw tool active                         │
│  │  └─ Each stroke broadcasts instantly         │
│  │                                               │
│  └─ If User is PARTICIPANT:                     │
│     ├─ Canvas mouse events DISABLED             │
│     ├─ Receives stroke data                     │
│     ├─ Renders each stroke immediately          │
│     └─ No local drawing possible                │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Stroke Format
```javascript
{
  type: "stroke",
  points: [
    { x: 100, y: 150 },
    { x: 101, y: 152 },
    { x: 102, y: 154 }
  ],
  color: "#FF5733",
  size: 3,
  timestamp: 1674531045000
}
```

### Event Flow
```
HOST draws:

Mouse move generates points -> batch after 50ms ->
  
Client: whiteboard-draw
  { roomId, data: { points, color, size } }
  ─────────────────────────────────────────> Server validates host

Server broadcasts whiteboard-draw:
  ─────────────────────────────────────────> ALL participants
  
Participants' canvas:
  - Receive stroke data
  - drawLine(points[i], points[i+1])
  - Stroke appears INSTANTLY
```

### Real-time Performance
- **Latency**: < 100ms for most networks
- **Batching**: Reduce bandwidth by batching points
- **Rendering**: Canvas native rendering (no lag)

---

## 🎤 Voice Chat (WebRTC)

### Current Status: IMPLEMENTED
Uses the `useWebRTC` hook with Socket.IO signaling

### Architecture
```
User A                    Signal Server              User B
  │                          (Socket.IO)              │
  │                                                    │
  ├─ webrtc-offer ─────────────────────────────────> │
  │  (SDP offer with codec preferences)               │
  │                                                    │
  │ <──────── webrtc-answer ──────────────────────────┤
  │  (SDP answer)                                      │
  │                                                    │
  ├─ webrtc-ice-candidate ──────────────────────────> │
  │  (multiple ICE candidates for NAT traversal)      │
  │                                                    │
  │ <──── webrtc-ice-candidate ────────────────────────┤
  │                                                    │
  ├─────────────── P2P Audio Stream ──────────────────>│
  │  (Direct connection, no server relay)              │
  │                                                    │
  └─ Automatic on room join (no "call" button)
```

### Key Features
✅ Audio connects automatically on room join  
✅ Mute/Unmute microphone button  
✅ Mute/Unmute speaker button  
✅ No "call" button needed  
✅ Host can end voice session (disconnects all)  

### Signal Events (server.js)
```javascript
socket.on('webrtc-offer', ({ roomId, offer, targetSocketId }) => {
  socket.to(targetSocketId).emit('webrtc-offer', { 
    offer, 
    fromSocketId: socket.id 
  });
});

socket.on('webrtc-answer', ({ roomId, answer, targetSocketId }) => {
  socket.to(targetSocketId).emit('webrtc-answer', { 
    answer, 
    fromSocketId: socket.id 
  });
});

socket.on('webrtc-ice-candidate', ({ roomId, candidate, targetSocketId }) => {
  socket.to(targetSocketId).emit('webrtc-ice-candidate', { 
    candidate, 
    fromSocketId: socket.id 
  });
});
```

---

## 📄 Document Upload & Sharing

### Flow
```
User uploads file:

Client: POST /api/upload-document
  FormData: { document: File, roomId, fileName }
  ──────────────────────────────────────────────> Server

Server: 
  ├─ Save to /uploads folder
  ├─ Update room.documents in DB
  ├─ Broadcast document-uploaded event
  
Client: document-uploaded
  { document: { name, type, url, size } }
  <──────────────────────────────────────────────
  
All participants see new document instantly
```

### Characteristics
✅ Any user can upload  
✅ Instant visibility to all participants  
✅ Persists in room history  
✅ Survives room restarts  
❌ Not saved after host ends meeting (future: archive)  

---

## 🔐 Security & Validation

### Host Verification (All Commands)
```javascript
// Every command verifies:
const userId = socketToUser.get(socket.id);
const room = data.rooms.find(r => r.id === roomId);

if (room && room.hostId === userId) {
  // Allowed
} else {
  // Rejected - log attempt
  console.log(`SECURITY: Unauthorized action by user ${userId}`);
}
```

### Data Validation
- ✅ Room ID must exist
- ✅ User ID must exist
- ✅ Host can only control their own room
- ✅ File uploads limited to 50MB
- ✅ Allowed MIME types only

---

## 📊 Monitoring & Logging

### Server Logs
```
✅ User connected: socket_123
✅ User joined room: ABC123
🎥 Host playing YouTube: dQw4w9WgXcQ
🎨 Host drew on whiteboard
💬 New message in room
❌ User disconnected
🔴 Room ended: ABC123
❌ SECURITY: Unauthorized action by user 5
```

### Database Consistency
- ✅ All state changes saved to data.json
- ✅ Atomic writes (no partial updates)
- ✅ Backup created before critical operations

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] Change `http://localhost:5000` to production URL
- [ ] Enable CORS for production domain
- [ ] Implement authentication (JWT or sessions)
- [ ] Use bcrypt for password hashing
- [ ] Setup database (PostgreSQL/MongoDB)
- [ ] Enable HTTPS (required for WebRTC)
- [ ] Implement rate limiting
- [ ] Setup monitoring/alerting
- [ ] Implement backup/restore strategy
- [ ] Test room history persistence
- [ ] Load test with multiple concurrent rooms

### Configuration
```javascript
// server.js
const io = new Server(httpServer, {
  cors: {
    origin: "https://yourdomain.com",  // Production domain
    methods: ["GET", "POST"]
  }
});
```

---

## 🧪 Testing Guide

### Test Room History Persistence
1. Create room as User A
2. Invite User B to join
3. Both users chat
4. User B refreshes page → should still see room
5. User B leaves room
6. User B goes to Home → room should appear in history
7. Host ends room
8. Both users refresh → room should still be visible with `isActive: false`

### Test YouTube Host Control
1. Host plays video → Participants should see same video
2. Participant tries to play different video → should fail
3. Host pauses → All should pause
4. Participant tries to seek → should be ignored
5. New participant joins → should sync to host's current time

### Test Whiteboard
1. Host draws → All see stroke instantly
2. Participant tries to draw → no effect
3. Host clears → All cleared
4. New participant joins → sees all previous strokes

---

## 📈 Performance Optimization

### Bandwidth Reduction
- Canvas strokes batched every 50ms
- Elapsed time sent every 1s (not 60/s)
- Room state synced only on join/terminate
- Use gzip compression for HTTP

### CPU/Memory
- Room state in-memory (not persistent for transient data)
- WebRTC peer connections limit (recommend max 50/room)
- Canvas rendering optimized (requestAnimationFrame)

---

## 🐛 Known Limitations & Future Work

### Current Limitations
- ⚠️ Room history only in data.json (no DB scaling)
- ⚠️ Password stored in plain text (needs bcrypt)
- ⚠️ No user authentication (anyone can login)
- ⚠️ WebRTC limited to same network (needs TURN servers for external)
- ⚠️ No recording feature (planned)
- ⚠️ No screen sharing (planned)

### Future Enhancements
- [ ] Database migration (PostgreSQL)
- [ ] Real authentication system
- [ ] TURN servers for WebRTC
- [ ] Recording with playback
- [ ] Screen sharing
- [ ] Breakout rooms
- [ ] Chat message persistence
- [ ] Automated summaries (AI)
- [ ] Analytics dashboard

---

## 📞 Support & Debugging

### Common Issues

**Q: Room disappears after leaving**  
A: Fixed ✅ - Backend now preserves participants in completed rooms

**Q: Elapsed time shows different values**  
A: Client is using local time instead of server time. Check `socket.on('elapsed-time-update')`

**Q: Participant can draw on whiteboard**  
A: Backend not validating host. Check `room.hostId === userId`

**Q: YouTube video doesn't sync**  
A: Late joiner not receiving `youtube-sync`. Check join-room handler.

---

## 🎓 Learning Outcomes

This architecture teaches:
1. Real-time synchronization with Socket.IO
2. Server-authoritative state management
3. Role-based access control
4. WebRTC audio streaming
5. Canvas drawing with real-time sync
6. Database persistence patterns
7. Centralized room state management

---

**End of Document**

For questions or issues, refer to the code comments in:
- `backend/server.js` - Backend Socket.IO handlers
- `src/context/AppContext.jsx` - Frontend state management
- `src/context/SocketContext.jsx` - Socket.IO client setup
- `src/pages/ActiveRoom.jsx` - Real-time room implementation
