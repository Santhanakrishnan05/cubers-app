# Cubers App Backend

## Setup Instructions

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Start the Backend Server
```bash
npm run dev
```
or for production:
```bash
npm start
```

The server will run on `http://localhost:5000`

### 3. Uploaded Files Location
All uploaded images are stored in the `backend/uploads/` folder.

## API Endpoints

### Upload Image
- **POST** `/api/upload`
- **Body**: FormData with file under `avatar` key
- **Response**: 
```json
{
  "success": true,
  "filename": "avatar-1234567890-987654321.jpg",
  "url": "http://localhost:5000/uploads/avatar-1234567890-987654321.jpg",
  "message": "File uploaded successfully"
}
```

## File Size Limits
- Maximum file size: 5MB
- Accepted formats: JPEG, PNG, GIF, WebP

## Important
Make sure the backend server is running before trying to upload images in the frontend application.
