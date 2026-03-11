# ⚡ QUICK REFERENCE CARD

## Start Your App (2 Terminals Needed)

### Terminal 1: Backend
```bash
cd D:\Krish\CubersApp\cubers-app\backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd D:\Krish\CubersApp\cubers-app
npm run dev
```

---

## Key Locations

| What | Where |
|------|-------|
| All data | `backend/data.json` |
| User images | `backend/uploads/` |
| API server | `backend/server.js` |
| Frontend | `src/App.jsx` |

---

## Test It

1. **Register** - Create new account → Check `data.json`
2. **Login** - Same device → Works ✅
3. **Refresh** - Stay logged in ✅
4. **Other Device** - Same login → Works ✅
5. **Create Room** - Check `data.json` ✅
6. **Upload Image** - Check `uploads/` ✅

---

## API Endpoints

```
POST   /api/register         Register user
POST   /api/login            Login user
GET    /api/users            Get all users
POST   /api/rooms            Create room
GET    /api/rooms            Get all rooms
POST   /api/upload           Upload image
```

---

## File Structure

```
backend/data.json
├── users: [{id, name, email, phone, password, avatar, createdAt}]
└── rooms: [{id, name, hostId, participants, messages, documents...}]
```

---

## What Gets Saved

✅ New user registrations  
✅ Room creations  
✅ User avatars (images)  
✅ Timestamps  
✅ Participant info  
✅ Room details  

---

## Multi-Device Flow

```
Device A: Register → Saved to data.json
     ↓
Device B: Login with same email/pass
     ↓
Backend reads data.json
     ↓
✅ User logged in on Device B
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection error" | Start backend first |
| Email exists | Use different email |
| Can't upload | Backend must be running |
| No data saved | Check data.json permissions |
| Port 5000 busy | Kill old process, restart |

---

## Data in data.json

```json
{
  "users": [
    {
      "id": 1,
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+91 1234567890",
      "password": "password123",
      "avatar": "http://localhost:5000/uploads/avatar-123.jpg",
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
      "createdAt": "2026-01-24T10:30:45Z"
    }
  ]
}
```

---

## LocalStorage

```javascript
// Current user session
cubersCurrentUser = {id, name, email, phone, avatar}

// All cached data
cubersAppData = {users: [], rooms: []}
```

---

## Success Indicators

✅ Backend shows: "✅ Server running on http://localhost:5000"  
✅ `data.json` has user entries  
✅ User stays logged in after refresh  
✅ Can login from different device  
✅ Images appear in `uploads/` folder  
✅ No errors in browser console  

---

## Important Commands

```bash
# Start backend
npm run dev       # in backend folder

# Start frontend  
npm run dev       # in root folder

# Build for production
npm run build     # in root folder

# Check if port 5000 is free (Windows)
netstat -ano | findstr :5000

# Kill process on port 5000 (Windows)
taskkill /PID <PID> /F
```

---

## API Usage Examples

### Register
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","phone":"+91 987654","password":"pass123","avatar":null}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'
```

### Get All Users
```bash
curl http://localhost:5000/api/users
```

---

## Documentation Files

- 📖 `IMPLEMENTATION_SUMMARY.md` - System overview
- 🧪 `QUICK_TEST_GUIDE.md` - How to test
- 📚 `BACKEND_DATA_GUIDE.md` - Detailed guide
- 🔧 `API_REFERENCE.md` - API docs
- ✅ `SETUP_CHECKLIST.md` - Verification
- 🏗️ `ARCHITECTURE_DIAGRAM.md` - Diagrams
- 📋 `COMPLETE_CHECKLIST.md` - Full list

---

## Feature Status

| Feature | Status |
|---------|--------|
| Registration | ✅ |
| Login | ✅ |
| Multi-device login | ✅ |
| Room creation | ✅ |
| Image upload | ✅ |
| Data persistence | ✅ |
| LocalStorage cache | ✅ |
| Auto-login | ✅ |

---

## What's Next?

1. ✅ Test all features
2. ✅ Verify data in `data.json`
3. ✅ Test from different device
4. 📊 Add messages functionality
5. 📄 Add documents handling
6. 🔐 Add password hashing
7. 🚀 Deploy to production

---

## Port Numbers

```
Frontend: 5173 (Vite dev server)
Backend:  5000 (Express server)
```

---

## File Uploads

```
Max size: 5MB
Allowed: JPEG, PNG, GIF, WebP
Saved to: backend/uploads/
URL format: http://localhost:5000/uploads/avatar-<timestamp>-<random>.jpg
```

---

## Email Rules

✅ Must be unique per user
✅ Used for login identification
✅ Cannot register same email twice
✅ Case-insensitive comparison

---

## User ID Generation

- Automatically incremented
- First user: ID = 1
- New user: ID = max(existing) + 1
- Unique per registration

---

## Room ID Generation

- Random 6-character alphanumeric
- Format: "ABC123"
- Unique per room creation
- Used for room codes

---

## Timestamps

All stored in ISO 8601 format:
```
Date: "2026-01-24"
DateTime: "2026-01-24T10:30:45.123Z"
```

---

**🚀 Your app is ready to use!**

Start backend → Start frontend → Register → Test → Done!

Questions? Check the documentation files above.
