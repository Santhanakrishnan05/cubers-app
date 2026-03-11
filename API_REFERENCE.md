# Backend API Reference

## Base URL
```
http://localhost:5000
```

---

## 1. Upload Image

### Request
```
POST /api/upload
```

**Content-Type:** multipart/form-data

**Body:**
```
avatar: <file>
```

### Response Success (200)
```json
{
  "success": true,
  "filename": "avatar-1234567890-987654321.jpg",
  "url": "http://localhost:5000/uploads/avatar-1234567890-987654321.jpg",
  "message": "File uploaded successfully"
}
```

### Response Error (400)
```json
{
  "error": "Only image files are allowed"
}
```

---

## 2. Register User

### Request
```
POST /api/register
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "password": "SecurePass@123",
  "avatar": "http://localhost:5000/uploads/avatar-123.jpg"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 9876543210",
    "password": "SecurePass@123",
    "avatar": "http://localhost:5000/uploads/avatar-123.jpg",
    "createdAt": "2026-01-24"
  }
}
```

### Response Error (400)
```json
{
  "error": "Email already registered"
}
```

---

## 3. Login User

### Request
```
POST /api/login
Content-Type: application/json
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 9876543210",
    "password": "SecurePass@123",
    "avatar": "http://localhost:5000/uploads/avatar-123.jpg",
    "createdAt": "2026-01-24"
  }
}
```

### Response Error (401)
```json
{
  "error": "Invalid credentials"
}
```

---

## 4. Get All Users

### Request
```
GET /api/users
```

### Response Success (200)
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "name": "Santhana Krishnan J",
      "email": "santhanakrishnan02065@gmail.com",
      "phone": "+91 8838658734",
      "password": "Krish@123",
      "avatar": null,
      "createdAt": "2026-01-24"
    },
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      ...
    }
  ]
}
```

---

## 5. Get User by ID

### Request
```
GET /api/users/:id
```

**Example:**
```
GET /api/users/1
```

### Response Success (200)
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Santhana Krishnan J",
    "email": "santhanakrishnan02065@gmail.com",
    "phone": "+91 8838658734",
    "password": "Krish@123",
    "avatar": null,
    "createdAt": "2026-01-24"
  }
}
```

### Response Error (404)
```json
{
  "error": "User not found"
}
```

---

## 6. Update User

### Request
```
PUT /api/users/:id
Content-Type: application/json
```

**Example:**
```
PUT /api/users/1
```

**Body:** (Only include fields to update)
```json
{
  "avatar": "http://localhost:5000/uploads/new-avatar-123.jpg"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "name": "Santhana Krishnan J",
    "email": "santhanakrishnan02065@gmail.com",
    "phone": "+91 8838658734",
    "password": "Krish@123",
    "avatar": "http://localhost:5000/uploads/new-avatar-123.jpg",
    "createdAt": "2026-01-24"
  }
}
```

---

## 7. Create Room

### Request
```
POST /api/rooms
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Advanced Mathematics",
  "hostId": 1,
  "hostName": "Santhana Krishnan J"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Room created successfully",
  "room": {
    "id": "ABC123",
    "name": "Advanced Mathematics",
    "hostId": 1,
    "startTime": "10:30:45",
    "endTime": "",
    "date": "1/24/2026",
    "duration": "2 hours",
    "participantCount": 1,
    "participants": [
      {
        "id": 1,
        "name": "Santhana Krishnan J",
        "isHost": true
      }
    ],
    "messages": [],
    "documents": [],
    "recording": {
      "duration": "0:00:00",
      "currentTime": "0:00:00"
    },
    "summary": "",
    "createdAt": "2026-01-24T10:30:45.123Z"
  }
}
```

### Response Error (400)
```json
{
  "error": "Room name and host ID are required"
}
```

---

## 8. Get All Rooms

### Request
```
GET /api/rooms
```

### Response Success (200)
```json
{
  "success": true,
  "rooms": [
    {
      "id": "JUO952",
      "name": "Maths",
      "hostId": 1,
      ...
    },
    {
      "id": "ABC123",
      "name": "Advanced Mathematics",
      ...
    }
  ]
}
```

---

## 9. Get Room by ID

### Request
```
GET /api/rooms/:id
```

**Example:**
```
GET /api/rooms/ABC123
```

### Response Success (200)
```json
{
  "success": true,
  "room": {
    "id": "ABC123",
    "name": "Advanced Mathematics",
    ...
  }
}
```

### Response Error (404)
```json
{
  "error": "Room not found"
}
```

---

## 10. Update Room

### Request
```
PUT /api/rooms/:id
Content-Type: application/json
```

**Example:**
```
PUT /api/rooms/ABC123
```

**Body:** (Only include fields to update)
```json
{
  "messages": [
    {
      "id": 1,
      "userId": 1,
      "userName": "Santhana Krishnan J",
      "message": "Hello everyone!",
      "timestamp": "2026-01-24T10:31:00Z"
    }
  ]
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Room updated successfully",
  "room": {
    "id": "ABC123",
    ...
  }
}
```

---

## Error Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid credentials) |
| 404 | Not found |
| 500 | Server error |

---

## Notes

- All timestamps are in ISO format: `2026-01-24T10:30:45.123Z`
- File URLs can be accessed directly: `http://localhost:5000/uploads/filename.jpg`
- Maximum file size: 5MB
- Allowed image formats: JPEG, PNG, GIF, WebP
- Email must be unique per user
- All data persists in `data.json`
