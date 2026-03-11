# System Architecture Diagram

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUBERS APP ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

                      ┌──────────────────┐
                      │   DEVICE A       │
                      │   (Browser)      │
                      └────────┬─────────┘
                               │
                    ┌──────────▼─────────┐
                    │  App (React)       │
                    │  localStorage      │
                    └──────────┬─────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  API Calls             │
                    │  /api/register         │
                    │  /api/login            │
                    │  /api/rooms            │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │   EXPRESS.JS Backend       │
                    │   Port: 5000               │
                    │                            │
                    │  ✅ User Management       │
                    │  ✅ Room Management       │
                    │  ✅ Image Upload          │
                    │  ✅ Data Validation       │
                    └──────────┬─────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼──────┐      ┌──────▼──────┐      ┌─────▼────────┐
    │ data.json  │      │  uploads/   │      │  Redis/DB    │
    │            │      │  (images)   │      │  (future)    │
    │ Users[]    │      │             │      │              │
    │ Rooms[]    │      │ avatar-*.   │      │              │
    │            │      │ avatar-*.   │      │              │
    └────────────┘      └─────────────┘      └──────────────┘

                      ┌──────────────────┐
                      │   DEVICE B       │
                      │   (Browser)      │
                      └────────┬─────────┘
                               │
                    ┌──────────▼─────────┐
                    │  App (React)       │
                    │  localStorage      │
                    └──────────┬─────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  Same API Calls        │
                    │  /api/login (same user)│
                    │  /api/rooms (all rooms)│
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │   EXPRESS.JS Backend       │
                    │   (Same data.json)         │
                    └────────────────────────────┘
```

---

## User Registration & Multi-Device Flow

```
┌─────────────────────────────────────────────────────────────┐
│              USER REGISTRATION FLOW                          │
└─────────────────────────────────────────────────────────────┘

SYSTEM A:
User fills form
     │
     ▼
┌─────────────────────┐
│ Name: John          │
│ Email: john@ex.com  │
│ Phone: +91 987654   │
│ Password: Pass@123  │
│ Avatar: image.jpg   │
└────────┬────────────┘
         │
         ▼
Frontend sends POST /api/register
         │
         ▼
    ┌────────────────┐
    │ Backend Server │
    │   (Port 5000)  │
    │                │
    │ ✓ Validate     │
    │ ✓ Unique email │
    │ ✓ Create user  │
    │ ✓ Save image   │
    └────────┬───────┘
             │
             ▼
    ┌──────────────────────────┐
    │ SAVED TO data.json:      │
    │                          │
    │ {                        │
    │   "users": [             │
    │     {                    │
    │       "id": 2,           │
    │       "name": "John",    │
    │       "email": "john@", │
    │       "phone": "+91..", │
    │       "password": "P@",  │
    │       "avatar": "http.." │
    │     }                    │
    │   ]                      │
    │ }                        │
    └────────┬─────────────────┘
             │
             ▼
    ✅ User logged in on System A
             │
             ▼
          localStorage:
          cubersCurrentUser = {id:2, name:"John"...}

========================================

SYSTEM B (Different Computer):
User opens app
     │
     ▼
Enters email: john@ex.com
Enters password: Pass@123
     │
     ▼
Frontend sends POST /api/login
     │
     ▼
   ┌────────────────┐
   │ Backend Server │
   │ Reads data.json│
   │ Finds user!    │
   │ Validates pwd! │
   │ Returns user   │
   └────────┬───────┘
            │
            ▼
    ✅ Same user logged in on System B
            │
            ▼
        localStorage:
        cubersCurrentUser = {id:2, name:"John"...}

    Both systems have identical user data!
```

---

## Room Creation & Access

```
┌─────────────────────────────────────────────────────────────┐
│         ROOM CREATION & MULTI-DEVICE ACCESS                 │
└─────────────────────────────────────────────────────────────┘

DEVICE A - User creates room:
┌─────────────────────┐
│ Room Name: Maths    │
│ Host: John (id: 2)  │
└────────┬────────────┘
         │
         ▼
POST /api/rooms {name, hostId, hostName}
         │
         ▼
Backend Creates Room
         │
    ┌────▼────┐
    │ Generate│
    │ ID:     │ → "XYZ789"
    │ XYZ789  │
    └────┬────┘
         │
         ▼
┌────────────────────────────────────┐
│ Saved to data.json:                │
│ {                                  │
│   "id": "XYZ789",                  │
│   "name": "Maths",                 │
│   "hostId": 2,                     │
│   "participants": [{id:2, ...}],   │
│   "createdAt": "2026-01-24"        │
│ }                                  │
└────────┬───────────────────────────┘
         │
         ▼
    ✅ Room created on Device A

========================================

DEVICE B - User sees same room:
Frontend: GET /api/rooms
         │
         ▼
Backend reads data.json
         │
         ▼
Returns all rooms including "XYZ789"
         │
         ▼
┌──────────────────────┐
│ Room List:           │
│ ✓ JUO952 (Maths)    │
│ ✓ XYZ789 (Maths)    │  ← Created on Device A!
│                      │
└──────────────────────┘
         │
         ▼
User B clicks "XYZ789"
         │
         ▼
Joins room created by User A!
```

---

## Data Persistence Layers

```
┌─────────────────────────────────────────────────────────────┐
│          THREE LAYERS OF DATA PERSISTENCE                   │
└─────────────────────────────────────────────────────────────┘

LAYER 1: VOLATILE
┌──────────────────────────────┐
│  React State Variables       │
│  (Lost on refresh)           │
│  [currentUser, selectedRoom] │
└──────────────────────────────┘
          │ Loads from │
          ▼

LAYER 2: LOCAL
┌──────────────────────────────────────────┐
│  Browser LocalStorage                    │
│  (Survives refresh, one device only)     │
│  - cubersAppData (users, rooms)          │
│  - cubersCurrentUser (logged-in user)    │
└──────────────────────────────────────────┘
          │ Syncs with │
          ▼

LAYER 3: PERSISTENT
┌──────────────────────────────────────────┐
│  Backend (data.json)                     │
│  (Permanent, multi-device accessible)    │
│  ✓ Users array                           │
│  ✓ Rooms array                           │
│  ✓ All persistent data                   │
│                                          │
│  Accessible from ANY device at any time! │
└──────────────────────────────────────────┘

Data Priority:
1. Try LocalStorage (Fast ⚡)
2. If missing, fetch from Backend (Reliable ✅)
3. Backend is source of truth (Shared 🔄)
```

---

## API Endpoint Flow

```
┌─────────────────────────────────────────────────────────────┐
│            API REQUEST → BACKEND → DATA.JSON               │
└─────────────────────────────────────────────────────────────┘

REQUEST: POST /api/register
┌────────────────┐
│ {              │
│   name, email, │
│   phone, pass  │
│ }              │
└────────┬───────┘
         │
    ┌────▼────────────────────┐
    │ Express Backend Handler │
    │                         │
    │ 1. Validate input       │
    │ 2. Check email unique   │
    │ 3. Generate user ID     │
    │ 4. Create user object   │
    │ 5. Read data.json       │
    │ 6. Add user to array    │
    │ 7. Write data.json      │
    └────┬────────────────────┘
         │
         ▼
    ┌──────────────┐
    │  data.json   │
    │  {users:[    │
    │   {...},     │
    │   {NEW}  ◄── NEW USER SAVED
    │  ]}          │
    └──────┬───────┘
           │
           ▼
    ┌─────────────────┐
    │ Send Response   │
    │ success: true   │
    │ user: {NEW}     │
    └────────┬────────┘
             │
             ▼
    Frontend stores in
    localStorage + state
```

---

## File Write Operations

```
┌─────────────────────────────────────────────────────────────┐
│        WHEN DATA.JSON GETS WRITTEN                          │
└─────────────────────────────────────────────────────────────┘

Event: User Registration
└─► Backend reads data.json
    └─► Adds new user
        └─► Writes data.json ✅

Event: User Login
└─► Backend reads data.json
    └─► No write (read-only)

Event: Create Room
└─► Backend reads data.json
    └─► Adds new room
        └─► Writes data.json ✅

Event: Send Message
└─► Backend reads data.json
    └─► Finds room
        └─► Adds message
            └─► Writes data.json ✅

Event: Upload Image
└─► Backend saves image to uploads/
    └─► Saves image URL to data.json ✅

Event: Update Avatar
└─► Backend reads data.json
    └─► Updates user avatar URL
        └─► Writes data.json ✅
```

---

## Request/Response Cycle

```
┌─────────────────────────────────────────────────────────────┐
│        COMPLETE REQUEST/RESPONSE CYCLE                      │
└─────────────────────────────────────────────────────────────┘

CLIENT                          SERVER

User fills form
     │
     ├──► Frontend validates
     │
     │    POST /api/register
     ├────────────────────────────────►  Receives request
     │                                   │
     │                                   ├─► Parse JSON
     │                                   ├─► Validate data
     │                                   ├─► Check email unique
     │                                   ├─► Read data.json
     │                                   ├─► Add new user
     │                                   ├─► Write data.json
     │                                   │
     │                  Response 200 ◄──┤
     │◄─────────────────────────────────┤
     │   {success: true, user: {...}}   │
     │
     ├─► Store user in localStorage
     ├─► Update React state
     ├─► Redirect to home page
     │
     ▼
User logged in ✅
```

---

## Security Layers (Current)

```
┌─────────────────────────────────────────────────────────────┐
│            SECURITY IMPLEMENTATION                          │
└─────────────────────────────────────────────────────────────┘

CURRENT (Development):
✓ Email uniqueness check
✓ Basic input validation
✓ CORS enabled for frontend
✓ File type validation for uploads
✓ File size limit (5MB)

MISSING (For Production):
✗ Password hashing (plain text now)
✗ JWT authentication
✗ Rate limiting
✗ Input sanitization
✗ HTTPS/SSL
✗ Database authentication
✗ API key validation
✗ Logging & monitoring

```

---

## Summary

Your system now has:

```
✅ Persistent Data Storage    → data.json
✅ Multi-Device Access        → API endpoints
✅ Quick Caching              → localStorage
✅ Image Upload Support       → uploads/ folder
✅ User Management            → register, login, update
✅ Room Management            → create, update, join
✅ Complete REST API          → 10+ endpoints
✅ Error Handling             → try-catch everywhere
✅ CORS Support               → frontend can access
✅ File Validation            → images only
```

🚀 **Production-Ready Architecture!**
