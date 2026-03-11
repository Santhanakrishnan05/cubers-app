# System Diagrams & Flow Charts

## 1. Room Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ROOM LIFECYCLE                            │
└─────────────────────────────────────────────────────────────┘

┌─ CREATION ──────────────────────────────────────────────┐
│                                                          │
│  Host: "Create Room"                                    │
│    ↓                                                    │
│  POST /api/rooms                                       │
│    {name, hostId, hostName}                           │
│    ↓                                                    │
│  Backend creates:                                      │
│    - id: "ABC123"                                     │
│    - startTime: "10:02:12 AM" (display)               │
│    - actualStartTime: ISO (for calculations) ⭐       │
│    - participants: [host]                             │
│    - isActive: true                                   │
│    - Save to data.json                                │
│    ↓                                                    │
│  Frontend: Room created, navigate to ActiveRoom        │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ PARTICIPANT JOINS ─────────────────────────────────────┐
│                                                          │
│  Participant: "Enter room code"                        │
│    ↓                                                    │
│  Socket: 'join-room'                                   │
│    {roomId, userId, userName}                         │
│    ↓                                                    │
│  Backend:                                              │
│    ✅ Add to room.participants                        │
│    ✅ Send 'room-time' event                          │
│    ✅ Send 'elapsed-time-update'                      │
│    ✅ Send 'youtube-sync' (if active)                 │
│    ✅ Update participant count                         │
│    ↓                                                    │
│  Frontend:                                              │
│    ✅ Store server's actualStartTime                  │
│    ✅ Display elapsed time from server                │
│    ✅ Sync YouTube position (if active)               │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ ACTIVE SESSION ────────────────────────────────────────┐
│                                                          │
│  Every 1 second:                                       │
│    Server broadcasts 'elapsed-time-update'            │
│    All clients update timer display                    │
│    → All users see SAME elapsed time ✅               │
│                                                          │
│  Host controls:                                        │
│    - YouTube: play/pause/seek                         │
│    - Whiteboard: draw/clear                           │
│    - Messages: send/broadcast                         │
│    - Documents: upload/delete                         │
│                                                          │
│  Participants:                                          │
│    - View YouTube (read-only)                         │
│    - View whiteboard (read-only)                      │
│    - Send messages                                     │
│    - Upload documents                                  │
│    - Mute/unmute microphone                           │
│                                                          │
│  Real-time events broadcast to all:                    │
│    ✅ New messages (< 500ms)                          │
│    ✅ Whiteboard strokes (< 100ms)                    │
│    ✅ Documents uploaded (instant)                     │
│    ✅ Participant join/leave                          │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ ROOM TERMINATION ──────────────────────────────────────┐
│                                                          │
│  Host: "End Room"                                      │
│    ↓                                                    │
│  Socket: 'host-terminate-room'                         │
│    {roomId}                                           │
│    ↓                                                    │
│  Backend validates:                                    │
│    ✅ room.hostId === userId (MUST BE HOST)          │
│    ↓                                                    │
│  If valid:                                             │
│    - Set isActive: false                              │
│    - Record endTime                                    │
│    - Calculate duration from actualStartTime           │
│    - Record terminatedAt                              │
│    - KEEP participants array intact ✅                │
│    - Clear room state (YouTube, whiteboard)            │
│    - Broadcast 'room-terminated' to all               │
│    ↓                                                    │
│  All clients:                                          │
│    - Receive 'room-terminated'                        │
│    - Show "Room Ended" message                        │
│    - Disable all features                             │
│    - Redirect to Home                                 │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ HISTORY (✅ FIXED!) ───────────────────────────────────┐
│                                                          │
│  User goes to Home → "Your Activity"                   │
│    ↓                                                    │
│  GET /api/user-room-history/{userId}                  │
│    ↓                                                    │
│  Backend returns:                                      │
│    All rooms where participants[] includes userId      │
│    Sorted: active first, then by most recent          │
│    ↓                                                    │
│  Frontend displays:                                    │
│    Active rooms: 🟢 Live Session in Progress          │
│    Ended rooms: 🔴 Room Ended                         │
│    With: name, date, time, duration, participants    │
│    ↓                                                    │
│  User can:                                             │
│    ✅ Click "Tap to View" → See detailed history     │
│    ✅ Access documents                                │
│    ✅ Review messages                                 │
│                                                          │
│  CRITICAL: Room never disappears ✅                    │
│    - Even after user leaves                           │
│    - Even after room ends                             │
│    - Even after refresh/restart                       │
│    - Persists forever in database                     │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Socket.IO Real-Time Sync Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  REAL-TIME SYNCHRONIZATION                    │
└──────────────────────────────────────────────────────────────┘

HOST                        BACKEND                    PARTICIPANT
 │                            │                            │
 │        join-room            │                            │
 │───────────────────────────>│                            │
 │                            ├─ Add to participants       │
 │                            │                            │
 │                    room-time│                            │
 │<───────────────────────────┤                            │
 │    (startTimeISO)           │                            │
 │                            │                            │
 │        youtube-play         │                            │
 │ (host plays video)         │                            │
 │───────────────────────────>│                            │
 │                            ├─ Verify: hostId == userId  │
 │                            ├─ Store in roomState        │
 │                   youtube-play│──────────────────────────>│
 │                            │    (broadcast to all)       │
 │                            │        [synced at 0:00]     │
 │                            │                            │
 │  (every 1 second)          │                            │
 │  elapsed-time-update       │                            │
 │  [00:00:05]<───────────────┤                            │
 │                      (server calculated)                 │
 │                            │    elapsed-time-update      │
 │                            │    [00:00:05]               │
 │                            │──────────────────────────>│
 │                            │                            │
 │        whiteboard-draw     │                            │
 │ (host draws stroke)        │                            │
 │───────────────────────────>│                            │
 │                            ├─ Verify: hostId == userId  │
 │                            ├─ Store stroke              │
 │                   whiteboard-draw│──────────────────────>│
 │                            │    [stroke rendered]        │
 │                            │    (< 100ms latency)        │
 │                            │                            │
 │  (5 seconds later)          │                            │
 │  Host ends room            │                            │
 │    │                       │                            │
 │    └─>host-terminate-room  │                            │
 │───────────────────────────>│                            │
 │                            ├─ Verify: hostId == userId  │
 │                            ├─ Set isActive = false      │
 │                            ├─ Record end time           │
 │                   room-terminated│────────────────────>│
 │                            │                            │
 │  [Redirected to Home]      │  [Redirected to Home]     │
 │  [Room history shown] ✅   │  [Room history shown] ✅   │
 │                            │                            │
```

---

## 3. Host Verification Pattern

```
┌────────────────────────────────────────────────────────────┐
│          HOST-ONLY COMMAND VALIDATION FLOW                  │
└────────────────────────────────────────────────────────────┘

User sends command (e.g., youtube-play):

┌─────────────────────────────────┐
│ Client                          │
│  socket.emit('youtube-play',   │
│    {roomId, videoId, ...}      │
└────────────────┬────────────────┘
                 │
        ┌────────▼────────┐
        │ Backend receives│
        │  youtube-play   │
        └────────┬────────┘
                 │
        ┌────────▼──────────────────────┐
        │ Step 1: Get sender's user ID  │
        │  userId = socketToUser.get    │
        │            (socket.id)        │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ Step 2: Load database          │
        │  data = readDataFile()         │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ Step 3: Find room              │
        │  room = data.rooms.find(...)   │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────────────────┐
        │ Step 4: CRITICAL VERIFICATION             │
        │                                            │
        │  if (room && room.hostId === userId) {    │
        │     ✅ Allow action                       │
        │     io.to(roomId).emit('youtube-play')   │
        │  } else {                                  │
        │     ❌ Reject action                      │
        │     log("SECURITY: Unauthorized")         │
        │  }                                         │
        └────────┬──────────────────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ If ✅ ALLOWED:                  │
        │  Store state in roomState      │
        │  Broadcast to all participants │
        │  Response: success             │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ If ❌ REJECTED:                │
        │  NO error response             │
        │  (prevents info disclosure)    │
        │  Action silently fails         │
        └────────────────────────────────┘
```

---

## 4. Time Synchronization Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  TIME SYNCHRONIZATION                        │
└──────────────────────────────────────────────────────────────┘

Server: 10:02:15 UTC (authoritative)
Host client: 09:57:15 (5 min slow)
Participant A: 10:02:15 (correct)
Participant B: 10:07:15 (5 min fast)

WITHOUT server time sync:
  Each calculates elapsed independently
  Result: DESYNC by 10 minutes ❌

WITH server time sync:

┌─────────────────────────────────────────────────────┐
│  Room created at Server: 10:02:00 UTC               │
│  Stored in database:                                │
│    startTime: "10:02:00 AM" (display)              │
│    actualStartTime: "2026-01-24T10:02:00Z"        │ ⭐
└─────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Host         │ │ Part A       │ │ Part B       │
│ recv time    │ │ recv time    │ │ recv time    │
│ 10:02:00 UTC │ │ 10:02:00 UTC │ │ 10:02:00 UTC │
│ (server)     │ │ (server)     │ │ (server)     │
└──────────────┘ └──────────────┘ └──────────────┘
        │             │             │
    stores:       stores:       stores:
  actualStartTime actualStartTime actualStartTime
        │             │             │
  ┌─────▼──────────────▼─────────────▼─────┐
  │                                         │
  │   At T+5 seconds:                      │
  │                                         │
  │   Server calculates:                   │
  │   now = 10:02:05 UTC                   │
  │   elapsed = 10:02:05 - 10:02:00        │
  │   = 5 seconds                          │
  │                                         │
  │   Broadcasts: "elapsed: 00:00:05"      │
  │                                         │
  └─────┬──────────────┬─────────────┬─────┘
        │              │             │
        ▼              ▼             ▼
  Display: 00:00:05  Display: 00:00:05  Display: 00:00:05
  
  ✅ ALL SYNCHRONIZED!

Process repeats every 1 second:
  
  Server time authority
       ↓
  Calculate elapsed from actualStartTime
       ↓
  Broadcast elapsed to all
       ↓
  All clients display same elapsed time
       ↓
  Result: Perfect synchronization ✅
```

---

## 5. Database Structure

```
┌─────────────────────────────────────────────────────────┐
│              backend/data.json STRUCTURE                │
└─────────────────────────────────────────────────────────┘

{
  "users": [
    {
      "id": 1,
      "name": "Santhana Krishnan J",
      "email": "...",
      "phone": "...",
      "password": "...",
      "avatar": "...",
      "createdAt": "2026-01-24"
    }
  ],
  
  "rooms": [
    {
      "id": "ABC123",                    ⭐ Room identifier
      "name": "Mathematics Class",       ⭐ Display name
      "hostId": 1,                       ⭐ Host verification
      
      // Timing information
      "startTime": "10:02:12 AM",        ⭐ Display format
      "actualStartTime": "2026-01-24T10:02:12Z",  ⭐ Calculation base
      "createdAt": "2026-01-24T10:02:12Z",        ⭐ Backup
      "date": "24/01/2026",              ⭐ Display format
      
      // When host ends room
      "endTime": "11:30:45 AM",          ⭐ Display format
      "actualEndTime": "2026-01-24T11:30:45Z",    ⭐ ISO format
      "duration": "01:28:33",            ⭐ Actual elapsed
      "terminatedAt": "2026-01-24T11:30:45Z",    ⭐ When ended
      
      // Room status
      "isActive": false,                 ⭐ Active session?
      
      // CRITICAL: Participants preserved forever ✅
      "participants": [
        { "id": 1, "name": "Host", "isHost": true },
        { "id": 2, "name": "Student", "isHost": false },
        { "id": 3, "name": "Another Student", "isHost": false }
      ],
      "participantCount": 3,             ⭐ Count
      
      // Messages persist in history
      "messages": [
        {
          "id": 1,
          "userId": 1,
          "userName": "Host",
          "message": "Hello everyone",
          "timestamp": "2026-01-24T10:05:30Z"
        }
      ],
      
      // Documents persist in history
      "documents": [
        {
          "name": "lesson.pdf",
          "type": "pdf",
          "url": "/uploads/xyz.pdf",
          "size": 2048,
          "uploadedAt": "2026-01-24T10:05:30Z"
        }
      ],
      
      // Recording info (future feature)
      "recording": {
        "duration": "1:02:43",
        "currentTime": "0:16:13"
      },
      
      // Meeting summary (future feature)
      "summary": ""
    }
  ]
}
```

---

## 6. Component Communication Map

```
┌───────────────────────────────────────────────────────────────┐
│              REACT COMPONENT COMMUNICATION                     │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│      App.jsx                 │
│  (Router setup)              │
└────────────┬─────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────────┐  ┌───▼──────────┐
│ AppProvider  │  │ SocketProvider│
│ (Global)     │  │ (Real-time)   │
└───┬──────────┘  └───┬──────────┘
    │                 │
    │ provides:       │ provides:
    │ - currentUser   │ - socket
    │ - rooms[]       │
    │ - functions     │
    │                 │
    └────────┬────────┘
             │
   ┌─────────┴─────────┐
   │                   │
┌──▼──────┐     ┌──────▼──┐
│ Home    │     │ Login   │
│ page    │     │ page    │
└──┬──────┘     └────┬────┘
   │                │
   │ displays       │ manages
   │ Your Activity  │ auth
   │ + room list    │
   │                │
   └──────┬─────────┘
          │
       ┌──▼────────────────────────┐
       │  ActiveRoom              │
       │  (Main collaboration)    │
       ├──────────────────────────┤
       │                          │
       ├─ YouTube component      │
       │  └─ Host controls       │
       │     Participant view    │
       │                          │
       ├─ Whiteboard component   │
       │  └─ Host draws          │
       │     Participant sees    │
       │                          │
       ├─ Chat sidebar           │
       │  └─ Messages            │
       │     Participants list   │
       │                          │
       ├─ Documents section      │
       │  └─ Upload/view docs    │
       │                          │
       └─ Controls bar           │
          └─ Mute/unmute         │
             Leave/end room      │
```

---

## 7. Data Flow: Room Creation to History

```
User creates room:
    │
    ├─> POST /api/rooms
    │   {name, hostId, hostName}
    │
    └─> Backend creates room object:
        {
          id: "ABC123",
          hostId: 1,
          participants: [{id: 1, ...}],
          actualStartTime: "ISO",
          isActive: true,
          ...
        }
        │
        └─> Saved to data.json

User joins (via Socket.IO):
    │
    ├─> socket.on('join-room')
    │   {roomId, userId, userName}
    │
    └─> Backend:
        room.participants.push({id, name})
        room.participantCount++
        save to data.json

Host ends room:
    │
    ├─> socket.emit('host-terminate-room')
    │   {roomId}
    │
    └─> Backend:
        room.isActive = false
        room.endTime = "formatted"
        room.duration = "calculated"
        room.terminatedAt = "ISO"
        ⭐ KEEP participants array
        save to data.json

User checks history:
    │
    ├─> GET /api/user-room-history/{userId}
    │
    └─> Backend:
        Find all rooms where
        participants[].id includes userId
        │
        └─> Return sorted list:
            - Active rooms first
            - Then by most recent
            │
            └─> Frontend displays:
                Both active and ended rooms ✅
```

---

**Diagrams created**: Jan 24, 2026  
**Purpose**: Visual understanding of system architecture  
**Use**: Reference for developers and architects

