# Image Upload Feature - Setup & Usage Guide

## What's New?
Your Cubers App now has a complete image upload system with:
- ✅ Register page avatar upload
- ✅ Profile page avatar upload
- ✅ Node.js backend server with Express
- ✅ Files stored in `backend/uploads/` folder
- ✅ Image preview in avatars

## How to Run

### Terminal 1: Start Backend Server
```bash
cd cubers-app\backend
npm run dev
```
You should see: `✅ Server running on http://localhost:5000`

### Terminal 2: Start Frontend (in another terminal)
```bash
cd cubers-app
npm run dev
```

## How to Use Image Upload

### During Registration
1. Go to Register page
2. Click the "Upload" button next to the avatar circle
3. Select an image from your computer
4. Wait for the success message
5. Your avatar preview will appear
6. Complete registration to save the user with avatar

### In Profile Page (After Login)
1. Click the user icon in top right
2. Click "Upload" button next to your avatar
3. Select an image
4. Your profile avatar will update immediately
5. New avatars are automatically saved

## File Storage
All uploaded images are stored in:
```
cubers-app/backend/uploads/
```

Each file gets a unique name with timestamp to avoid conflicts.

## Accepted Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## Size Limit
Maximum 5MB per image

## Important Notes
⚠️ **Backend must be running** before uploading images
⚠️ **Keep backend terminal open** while using the app
⚠️ Images are uploaded to the backend folder, not lost on refresh

## Troubleshooting

### "Error uploading image"
- Make sure backend server is running on port 5000
- Check browser console for detailed errors
- Verify file is a valid image format

### Upload button not responding
- Ensure backend is running
- Check if port 5000 is not blocked

### Images not appearing
- Check if `backend/uploads/` folder exists
- Verify the backend server logs
