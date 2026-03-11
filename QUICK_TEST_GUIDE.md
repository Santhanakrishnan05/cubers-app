# Quick Test Guide - Backend Data Storage

## ✅ System Fully Implemented!

Your Cubers App now has complete backend data persistence. Here's what to test:

## Test 1: Registration with Backend Storage

**Steps:**
1. Make sure backend server is running on port 5000
2. Go to Register page
3. Fill form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Phone: `+91 1234567890`
   - Password: `Test@123`
   - Upload image (optional)
4. Click Register

**Expected:**
- Success message appears
- Auto-logged in to home page
- Data saved to `backend/data.json`
- Can login from different system with same credentials

---

## Test 2: Login from Different System

**Steps:**
1. In different browser/incognito/different device
2. Go to Login page
3. Enter:
   - Email: `test@example.com`
   - Password: `Test@123`
4. Click Log In

**Expected:**
- Login successful ✅
- User data fetched from backend
- Shows exact same data as original system

---

## Test 3: Room Creation Persistence

**Steps:**
1. Login as any user
2. Click "+ Create Room"
3. Enter room name: `Test Room`
4. Click Create

**Expected:**
- Room created successfully
- Room saved to `backend/data.json`
- Room persists after refresh
- Room accessible from other systems

---

## Test 4: Multi-Device Sync

**Steps:**
1. Open app on System A (register user)
2. Create a room on System A
3. Open app on System B (login with same credentials)
4. Check if room created on System A is visible on System B

**Expected:**
- ✅ Same rooms visible on both systems
- ✅ Same user data on both systems
- ✅ All data in sync via backend

---

## Test 5: Image Upload

**Steps:**
1. Go to Register page
2. Click "Upload" button
3. Select any image file
4. Register account

**Expected:**
- Image uploads successfully
- Avatar shows in preview
- User created with avatar URL
- Avatar persists on backend

---

## Test 6: Data Verification

**To verify data is saved:**

1. Open `backend/data.json` file
2. You should see:
   ```json
   {
     "users": [
       {
         "id": 1,
         "name": "Your Name",
         "email": "your@email.com",
         ...
       }
     ],
     "rooms": [
       {
         "id": "ABC123",
         "name": "Room Name",
         ...
       }
     ]
   }
   ```

---

## Troubleshooting

### Login shows "Connection error"
**Solution:** 
- Restart backend: `npm run dev` in backend folder
- Wait for server to start
- Reload frontend

### Registration fails
**Solution:**
- Check browser console (F12) for error details
- Make sure backend port 5000 is free
- Try different email address

### Data not saving to data.json
**Solution:**
- Check backend console for errors
- Verify file permissions on data.json
- Make sure backend is actually running

### Image upload fails
**Solution:**
- Backend might not be running
- Check if uploads folder exists
- Try smaller image file

---

## Key Features Implemented

✅ Registration saves to backend JSON
✅ Login validates against backend
✅ Multi-device login support
✅ Room creation persists to backend
✅ Image uploads to backend
✅ LocalStorage for offline caching
✅ All data syncs across systems
✅ Auto-login on page refresh

---

## Architecture Summary

```
Frontend (React)
    ↓
Client-Side Cache (localStorage)
    ↓
Backend API (Express.js)
    ↓
data.json (Persistent Storage)
    ↓
Uploads Folder (Images)
```

---

## Next Steps

1. Test all features mentioned above
2. Try accessing from another system/device
3. Close and reopen app - data persists ✅
4. Delete user from one system - verify on backend
5. Ready for production? See BACKEND_DATA_GUIDE.md for security improvements

Enjoy your fully functional backend-powered Cubers App! 🚀
