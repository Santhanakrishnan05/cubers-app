# 🏗️ Real-Time Collaborative Meeting System Architecture

## 📋 **Socket.IO Event Architecture**

### **Client → Server Events**

#### **Room Management**
- `join-room` - Join a room with userId, userName
- `leave-room` - Leave a room
- `get-participants` - Request current participant list
- `get-room-time` - Request synchronized room start time
- `host-terminate-room` - Host ends meeting for everyone

#### **Chat**
- `send-message` - Send chat message to room

#### **Whiteboard**
- `whiteboard-draw` - Broadcast drawing action
- `whiteboard-clear` - Clear whiteboard for all

#### **YouTube (Host Only)**
- `youtube-play` - Host plays video (broadcasts to all)
- `youtube-pause` - Host pauses video
- `youtube-seek` - Host seeks to position
- `youtube-sync-request` - New participant requests current state

#### **Documents**
- `document-uploaded` - Document uploaded (handled via HTTP + socket broadcast)

#### **WebRTC Signaling**
- `webrtc-offer` - Send WebRTC offer
- `webrtc-answer` - Send WebRTC answer
- `webrtc-ice-candidate` - Send ICE candidate

### **Server → Client Events**

#### **Presence**
- `user-joined` - User joined room
- `user-left` - User left room
- `room-participants` - Updated participant list
- `room-terminated` - Host ended meeting

#### **Chat**
- `new-message` - New message received

#### **Whiteboard**
- `whiteboard-draw` - Drawing action received
- `whiteboard-clear` - Clear command received

#### **YouTube**
- `youtube-play` - Video play command
- `youtube-pause` - Video pause command
- `youtube-seek` - Seek command
- `youtube-sync` - Current playback state

#### **Time Sync**
- `room-time` - Synchronized room start time
- `elapsed-time-update` - Server-calculated elapsed time

#### **Documents**
- `document-uploaded` - New document available

#### **WebRTC**
- `webrtc-offer` - Offer received
- `webrtc-answer` - Answer received
- `webrtc-ice-candidate` - ICE candidate received

## 🔄 **State Flow**

### **1. Room Join Flow**
```
User → join-room → Server
Server → Updates participants in DB
Server → room-time (synchronized start time)
Server → room-participants (current list)
Server → user-joined (broadcast to others)
```

### **2. Whiteboard Sync Flow**
```
User draws → whiteboard-draw → Server
Server → Broadcasts to all other participants
All participants → Receive and render drawing
```

### **3. YouTube Sync Flow (Host Controlled)**
```
Host selects video → youtube-play → Server
Server → Broadcasts to all participants
All participants → Load same video
Host plays/pauses → youtube-play/youtube-pause → Server
Server → Broadcasts to all
New participant → youtube-sync-request → Server
Server → youtube-sync (current state)
```

### **4. Document Upload Flow**
```
User uploads → HTTP POST → Server saves file
Server → document-uploaded (socket broadcast)
All participants → Receive and update UI
```

### **5. Time Synchronization Flow**
```
Room created → Server stores startTime + createdAt (ISO)
User joins → get-room-time → Server
Server → room-time (startTime + ISO timestamp)
Client → Calculates elapsed from server time
Server → Periodically broadcasts elapsed-time-update
```

## 🎯 **Implementation Requirements**

### **Backend (server.js)**
1. Store room start time in ISO format
2. Calculate elapsed time server-side
3. Broadcast time updates every second
4. Handle host-only YouTube controls
5. Proper participant tracking
6. WebRTC signaling

### **Frontend (ActiveRoom.jsx)**
1. useEffect for all socket listeners
2. Real-time participant list updates
3. Server-time-based elapsed calculation
4. Host-only YouTube controls
5. WebRTC audio setup
6. Whiteboard sync handling

### **Whiteboard Component**
1. Throttled drawing broadcasts
2. Receive and render remote drawings
3. No local-only state

### **YouTube Component**
1. Host controls only
2. Sync to current playback
3. Request sync on join

