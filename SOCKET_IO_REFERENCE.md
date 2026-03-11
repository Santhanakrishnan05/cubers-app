# QUICK REFERENCE: Socket.IO Events & Data Flow

## 🔴 CRITICAL ROOM HISTORY FIX

**Problem**: Room history disappeared when users left rooms  
**Root Cause**: Users were removed from `participants` array and filtered out of history  
**Solution**: Keep `participants` array intact. Rooms persist forever unless explicitly deleted.

**Code Change Summary**:
```javascript
// BEFORE (WRONG):
room.participants = room.participants.filter(p => p.id !== userId);  // ❌ Deletes history

// AFTER (CORRECT):
// Don't modify participants when user leaves - preserve history forever ✅
```

---

## 🔌 Socket.IO Events Reference

### Room Management Events

#### `join-room`
**Emitted by**: Client (React)  
**Received by**: Server  
**Data**:
```javascript
{
  roomId: "ABC123",
  userId: 1,
  userName: "John Doe"
}
```
**Server Actions**:
- Add user to room
- Send `room-time` event
- Send `youtube-sync` event
- Broadcast `user-joined` to others
- Broadcast `room-participants` list

---

#### `leave-room`
**Emitted by**: Client  
**Received by**: Server  
**Data**:
```javascript
{
  roomId: "ABC123",
  userId: 1
}
```
**Server Actions**:
- Remove socket from room
- **DO NOT remove from participants array** ✅
- Broadcast `user-left` to others

---

#### `host-terminate-room`
**Emitted by**: Host client (validation required)  
**Received by**: Server  
**Data**:
```javascript
{
  roomId: "ABC123"
}
```
**Server Actions**:
- Verify sender is host
- Set `room.isActive = false`
- Record `room.endTime` and `room.duration`
- Save to database
- Broadcast `room-terminated` to all
- Clear room state (YouTube, whiteboard)

---

### Time Synchronization Events

#### `room-time`
**Emitted by**: Server  
**Received by**: Client  
**Data**:
```javascript
{
  startTime: "10:02:12 AM",              // Display format
  startTimeISO: "2026-01-24T10:02:12Z"   // Calculation reference
}
```
**Client Action**: Store `startTimeISO` for elapsed time calculation

---

#### `elapsed-time-update`
**Emitted by**: Server (every 1 second)  
**Received by**: All clients in room  
**Data**:
```javascript
{
  elapsed: "00:05:30"                    // Formatted as HH:MM:SS
}
```
**Client Action**: Update display timer (don't recalculate)

---

### YouTube Events

#### `youtube-play` (Host Only)
**Emitted by**: Host client  
**Received by**: Server  
**Validation**: `room.hostId === userId` ✅  
**Data**:
```javascript
{
  roomId: "ABC123",
  videoId: "dQw4w9WgXcQ",
  currentTime: 0
}
```
**Server Actions**:
- Verify host
- Store in `roomState`
- Broadcast to all participants

---

#### `youtube-pause` (Host Only)
**Emitted by**: Host client  
**Received by**: Server  
**Validation**: `room.hostId === userId` ✅  
**Data**:
```javascript
{
  roomId: "ABC123"
}
```

---

#### `youtube-seek` (Host Only)
**Emitted by**: Host client  
**Received by**: Server  
**Validation**: `room.hostId === userId` ✅  
**Data**:
```javascript
{
  roomId: "ABC123",
  currentTime: 120  // seconds
}
```

---

#### `youtube-sync-request`
**Emitted by**: Participant (on join)  
**Received by**: Server  
**Data**:
```javascript
{
  roomId: "ABC123"
}
```
**Server Response**: `youtube-sync` event with current state

---

### Whiteboard Events

#### `whiteboard-draw` (Host Only)
**Emitted by**: Host client  
**Received by**: Server  
**Validation**: `room.hostId === userId` ✅  
**Data**:
```javascript
{
  roomId: "ABC123",
  data: {
    points: [
      { x: 100, y: 150 },
      { x: 101, y: 152 }
    ],
    color: "#FF5733",
    size: 3
  }
}
```
**Server Actions**:
- Verify host
- Store in `roomState.whiteboard`
- Broadcast to all

---

#### `whiteboard-clear` (Host Only)
**Emitted by**: Host client  
**Received by**: Server  
**Validation**: `room.hostId === userId` ✅  
**Data**:
```javascript
{
  roomId: "ABC123"
}
```

---

### Messaging Events

#### `send-message`
**Emitted by**: Any participant client  
**Received by**: Server  
**Data**:
```javascript
{
  roomId: "ABC123",
  userId: 1,
  userName: "John Doe",
  message: "Hello everyone!"
}
```
**Server Actions**:
- Save to database
- Broadcast `new-message` to all

---

#### `new-message`
**Emitted by**: Server  
**Received by**: All clients in room  
**Data**:
```javascript
{
  id: 5,
  userId: 1,
  userName: "John Doe",
  message: "Hello everyone!",
  timestamp: "2026-01-24T10:05:30Z"
}
```

---

### Document Events

#### `document-uploaded`
**Emitted by**: Server  
**Received by**: All clients in room  
**Data**:
```javascript
{
  document: {
    name: "presentation.pdf",
    type: "pdf",
    url: "/uploads/xyz.pdf",
    size: 2048,
    uploadedAt: "2026-01-24T10:05:30Z"
  }
}
```

---

### Participant Events

#### `user-joined`
**Emitted by**: Server  
**Received by**: All other clients in room  
**Data**:
```javascript
{
  userId: 2,
  userName: "Jane Smith"
}
```

---

#### `user-left`
**Emitted by**: Server  
**Received by**: All other clients in room  
**Data**:
```javascript
{
  userId: 2
}
```

---

#### `room-participants`
**Emitted by**: Server  
**Received by**: All clients in room  
**Data**:
```javascript
{
  participants: [
    { id: 1, name: "Host", isHost: true },
    { id: 2, name: "Student 1", isHost: false }
  ],
  count: 2
}
```

---

### Room Control Events

#### `room-terminated`
**Emitted by**: Server  
**Received by**: All clients in room  
**Data**: (empty)  
**Client Action**: 
- Redirect to home page
- Show "room ended" message
- Disable all room features

---

#### `room-state-sync`
**Emitted by**: Server  
**Received by**: Requesting client  
**Data**:
```javascript
{
  room: { /* full room object */ },
  participants: [ /* list */ ],
  documents: [ /* list */ ],
  messages: [ /* list */ ]
}
```

---

## 🔐 Role-Based Access Control Validation

### Host-Only Commands
```javascript
// Pattern used for all host-only events:
socket.on('youtube-play', ({ roomId, videoId, currentTime }) => {
  const userId = socketToUser.get(socket.id);
  const data = readDataFile();
  const room = data.rooms.find(r => r.id === roomId);
  
  // CRITICAL: Verify host
  if (room && room.hostId === userId) {
    // Allow action ✅
    io.to(roomId).emit('youtube-play', { videoId, currentTime });
  } else {
    // Reject action ❌
    console.log(`SECURITY: User ${userId} attempted unauthorized action`);
  }
});
```

### Commands That Work for Any Participant
- `send-message` - Any user can chat
- `youtube-sync-request` - Any user can request state
- `get-participants` - Any user can see participant list
- Mute/Unmute local audio (client-side, not broadcast)

---

## 📊 REST API Endpoints

### User Management
```
POST   /api/register               - Create account
POST   /api/login                  - Login
GET    /api/users                  - Get all users
GET    /api/users/:id              - Get user by ID
PUT    /api/users/:id              - Update user (avatar)
POST   /api/upload                 - Upload avatar
```

### Room Management
```
POST   /api/rooms                  - Create room (host)
GET    /api/rooms                  - Get all rooms
GET    /api/rooms/:id              - Get room by ID
GET    /api/user-room-history/:userId  - Get user's room history ⭐
PUT    /api/rooms/:id              - Update room
PUT    /api/rooms/update           - Update room documents
PUT    /api/rooms/terminate        - End room (host)
```

### Document Management
```
POST   /api/upload-document        - Upload document to room
DELETE /api/documents/:roomId/:filename  - Delete document
```

### YouTube Search
```
GET    /api/youtube/search?q=query - Search YouTube videos
```

---

## 🧪 Testing Commands

### Create Test Room
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "hostId": 1,
    "hostName": "Test Host"
  }'
```

### Get Room History for User
```bash
curl http://localhost:5000/api/user-room-history/1
```

### Verify Room Persistence
1. Create room
2. Join as participant
3. Leave room
4. Check `/api/user-room-history/:userId` → room should still appear ✅

---

## 🎯 Common Mistakes & Solutions

### ❌ Removing participants on leave
```javascript
// WRONG:
room.participants = room.participants.filter(p => p.id !== userId);
```
**Fix**: Don't remove - let participants list persist for history

---

### ❌ Using client time for elapsed calculation
```javascript
// WRONG:
const elapsed = Date.now() - clientStartTime;
```
**Fix**: Listen to `elapsed-time-update` from server

---

### ❌ Allowing participants to control YouTube
```javascript
// WRONG:
socket.on('youtube-play', ({ roomId, videoId }) => {
  io.to(roomId).emit('youtube-play', { videoId });  // No validation!
});
```
**Fix**: Always verify `room.hostId === userId`

---

### ❌ Not handling late joiners
```javascript
// WRONG:
// New participant never gets YouTube/whiteboard state
```
**Fix**: Send state on join:
```javascript
socket.emit('youtube-sync', roomState.youtube);
socket.emit('whiteboard-sync', roomState.whiteboard);
```

---

## 📝 Checklist Before Deployment

- [ ] Room history test passes (users don't lose room history)
- [ ] YouTube host-only control validated
- [ ] Whiteboard host-only control validated
- [ ] Elapsed time synchronized across users
- [ ] New participants get current state (YouTube, whiteboard)
- [ ] Host termination ends meeting for all
- [ ] Documents persist in room history
- [ ] Messages persist in room history
- [ ] Participants list preserved (never deleted)
- [ ] Server logs show all security events

---

## 🚀 Performance Tuning

### Optimize Elapsed Time Updates
```javascript
// Current: Every 1 second
setInterval(() => {
  io.to(room.id).emit('elapsed-time-update', { elapsed });
}, 1000);

// If bandwidth is issue, increase to 2-5 seconds
// Clients can interpolate in between
```

### Batch Canvas Strokes
```javascript
// Don't send every mousemove
// Batch points and send every 50ms
let points = [];
canvas.addEventListener('mousemove', (e) => {
  points.push({ x: e.x, y: e.y });
  
  if (Date.now() - lastSend > 50) {
    socket.emit('whiteboard-draw', { points, color, size });
    points = [];
    lastSend = Date.now();
  }
});
```

---

**Last Updated**: Jan 24, 2026  
**Status**: Room history persistence FIXED ✅
