# Backend Data Storage System - Complete Guide

## Overview
Your Cubers App now has a complete data persistence system:
- ✅ Backend JSON file (`data.json`) as source of truth
- ✅ LocalStorage for client-side caching
- ✅ API endpoints for register, login, and room management
- ✅ Multi-system login support

## Architecture

```
User on System A          User on System B
       ↓                          ↓
    Browser                    Browser
  (localStorage)             (localStorage)
       ↓                          ↓
   Frontend API Calls    Frontend API Calls
       ↓                          ↓
    Backend Server (Express)
       ↓
    data.json (Source of Truth)
```

## How It Works

### Registration Flow
1. User fills registration form on frontend
2. Frontend sends data to `POST /api/register`
3. Backend validates and saves to `data.json`
4. User automatically logged in
5. User data cached in localStorage for quick access

### Login Flow
1. User enters email/password on frontend
2. Frontend sends data to `POST /api/login`
3. Backend checks `data.json` for matching user
4. If found, user logged in and cached in localStorage
5. **Key**: User can now login from ANY system with same credentials

### Room Creation Flow
1. User creates room on frontend
2. Frontend sends request to `POST /api/rooms`
3. Backend creates room and saves to `data.json`
4. Room added to frontend local state
5. Room persists across all systems

## Setup Instructions

### 1. Start Backend Server
```bash
cd cubers-app/backend
npm run dev
```

You should see:
```
✅ Server running on http://localhost:5000
📁 Uploads folder: D:\...\cubers-app\backend\uploads
📄 Data file: D:\...\cubers-app\backend\data.json
```

### 2. Start Frontend
```bash
cd cubers-app
npm run dev
```

## API Endpoints Reference

### Users
```
POST   /api/register          - Register new user
POST   /api/login             - Login user
GET    /api/users             - Get all users
GET    /api/users/:id         - Get specific user
PUT    /api/users/:id         - Update user (avatar, etc.)
POST   /api/upload            - Upload profile image
```

### Rooms
```
POST   /api/rooms             - Create room
GET    /api/rooms             - Get all rooms
GET    /api/rooms/:id         - Get specific room
PUT    /api/rooms/:id         - Update room (messages, etc.)
```

## Data Storage

### Backend (data.json)
```json
{
  "users": [
    {
      "id": 1,
      "name": "User Name",
      "email": "email@example.com",
      "phone": "+91 123456789",
      "password": "password123",
      "avatar": "http://localhost:5000/uploads/...",
      "createdAt": "2026-01-24"
    }
  ],
  "rooms": [
    {
      "id": "ABC123",
      "name": "Room Name",
      "hostId": 1,
      "participants": [...],
      "messages": [...],
      ...
    }
  ]
}
```

### LocalStorage (Browser)
- **cubersAppData** - Cached users and rooms
- **cubersCurrentUser** - Currently logged-in user

## Use Cases

### Scenario 1: Same User, Different Systems
1. User registers on System A with email: `john@example.com`
2. Data saved to backend `data.json`
3. User goes to System B and opens app
4. Enters same email/password
5. Backend validates against `data.json` ✅ Login successful
6. Data fetched from backend and cached in localStorage

### Scenario 2: Room Creation Across Systems
1. User A creates room on their system
2. Room saved to backend `data.json`
3. User B (different system) sees the room in their room list
4. Both users can join and interact in the room

### Scenario 3: Offline-First Approach
1. User works on System A, data cached in localStorage
2. User can work even if backend is temporarily down
3. When backend comes back online, data syncs

## Important Notes

⚠️ **Backend must be running** for registration/login to work
⚠️ **Data persists** in `data.json` - even if you close the browser
⚠️ **localStorage is secondary** - backend is the source of truth
⚠️ **Passwords are stored in plain text** - in production, use hashing (bcrypt)
⚠️ **No authentication token** - simple demo. In production, use JWT

## Troubleshooting

### "Connection error"
- Backend might not be running
- Check if port 5000 is available
- Run: `npm run dev` in backend folder

### Data not persisting
- Check if `data.json` exists in backend folder
- Check backend console for errors
- Verify file permissions

### Users can't login on different system
- Ensure backend is running on both systems' networks
- Change `localhost:5000` to your server IP if needed
- Check firewall settings

### Can't register email twice
- Intentional: Email must be unique
- Try different email for testing

## File Locations

```
cubers-app/
├── backend/
│   ├── data.json          ← All persistent data
│   ├── uploads/           ← Uploaded images
│   ├── server.js          ← Backend API
│   └── package.json
└── src/
    └── App.jsx            ← Frontend
```

## Next Steps (Production)

1. Add password hashing (bcrypt)
2. Add JWT authentication
3. Add input validation & sanitization
4. Add error logging
5. Deploy backend to cloud (Heroku, AWS, etc.)
6. Update API endpoints to use deployed server URL
