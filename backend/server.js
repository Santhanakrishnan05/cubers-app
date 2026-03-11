import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import search from 'yt-search';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// Load .env from the same directory as this script (works regardless of CWD)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize AI providers
// Gemini (primary) — set GEMINI_API_KEY in backend/.env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Groq (fallback) — set GROQ_API_KEY in backend/.env  (free: https://console.groq.com)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

if (!GEMINI_API_KEY && !GROQ_API_KEY) {
  console.warn('⚠️  No AI API keys configured. Set GEMINI_API_KEY or GROQ_API_KEY in backend/.env');
  console.warn('   Get free Groq key at: https://console.groq.com');
}

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const app = express();
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:5173'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Function to read data from JSON file
const readDataFile = () => {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { users: [], rooms: [] };
  }
};

// Function to write data to JSON file
const writeDataFile = (data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ============ API ENDPOINTS ============

// Upload endpoint
app.post('/api/upload', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `${BACKEND_URL}/uploads/${req.file.filename}`;
  res.json({
    success: true,
    filename: req.file.filename,
    url: fileUrl,
    message: 'File uploaded successfully'
  });
});

// Register endpoint
app.post('/api/register', (req, res) => {
  const { name, email, phone, password, avatar } = req.body;

  // Validation
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const data = readDataFile();

  // Check if user already exists
  if (data.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Create new user
  const newUser = {
    id: data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1,
    name,
    email,
    phone,
    password,
    avatar: avatar || null,
    createdAt: new Date().toISOString().split('T')[0]
  };

  data.users.push(newUser);

  if (writeDataFile(data)) {
    res.json({
      success: true,
      message: 'User registered successfully',
      user: newUser
    });
  } else {
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const data = readDataFile();
  const user = data.users.find(u => u.email === email && u.password === password);

  if (user) {
    res.json({
      success: true,
      message: 'Login successful',
      user
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const data = readDataFile();
  const user = data.users.find(u => u.id === parseInt(req.params.id));

  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  const data = readDataFile();
  res.json({ success: true, users: data.users });
});

// Create room endpoint
app.post('/api/rooms', (req, res) => {
  const { name, hostId, hostName } = req.body;

  console.log('Creating room:', name, 'for hostId:', hostId);

  if (!name || !hostId) {
    return res.status(400).json({ error: 'Room name and host ID are required' });
  }

  const data = readDataFile();

  const now = new Date();
  const newRoom = {
    id: Math.random().toString(36).substr(2, 6).toUpperCase(),
    name,
    hostId,
    startTime: now.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }),
    endTime: '',
    date: now.toLocaleDateString(),
    duration: '00:00:00',
    participantCount: 1,
    participants: [{ id: hostId, name: hostName, isHost: true }],
    messages: [],
    documents: [],
    recording: { duration: '0:00:00', currentTime: '0:00:00' },
    summary: '',
    createdAt: now.toISOString(),
    actualStartTime: now.toISOString() // Store for server-side time calculation
  };

  console.log('Generated room ID:', newRoom.id);
  data.rooms.push(newRoom);
  console.log('Total rooms before save:', data.rooms.length);

  if (writeDataFile(data)) {
    console.log('Room saved to data.json successfully. Total rooms now:', data.rooms.length);
    res.json({
      success: true,
      message: 'Room created successfully',
      room: newRoom
    });
  } else {
    console.log('Failed to write room to data.json');
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Helper: enrich room participants and messages with current user avatars
function enrichRoomAvatars(room, users) {
  if (room.participants) {
    room.participants.forEach(p => {
      const user = users.find(u => u.id === p.id);
      if (user) p.avatar = user.avatar || null;
    });
  }
  if (room.messages) {
    room.messages.forEach(m => {
      const user = users.find(u => u.id === m.userId);
      if (user) m.avatar = user.avatar || null;
    });
  }
  return room;
}

// Get all rooms
app.get('/api/rooms', (req, res) => {
  const data = readDataFile();
  data.rooms.forEach(r => enrichRoomAvatars(r, data.users));
  res.json({ success: true, rooms: data.rooms });
});

// Get room history for a user - returns all rooms they participated in
app.get('/api/user-room-history/:userId', (req, res) => {
  const { userId } = req.params;
  const data = readDataFile();
  
  // Convert userId to number since participant IDs are stored as numbers
  const userIdNum = parseInt(userId);
  
  const userRooms = data.rooms.filter(room => 
    room.participants && room.participants.some(p => p && (p.id === userIdNum || p.id === userId))
  );
  
  // Sort: active first, then by most recent
  userRooms.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    const aTime = new Date(a.actualStartTime || a.createdAt || 0).getTime();
    const bTime = new Date(b.actualStartTime || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  
  res.json({ success: true, rooms: userRooms.map(r => enrichRoomAvatars(r, data.users)) });
});

// Get room by ID
app.get('/api/rooms/:id', (req, res) => {
  const data = readDataFile();
  const room = data.rooms.find(r => r.id === req.params.id);

  if (room) {
    enrichRoomAvatars(room, data.users);
    res.json({ success: true, room });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// Update room documents MUST BE BEFORE /api/rooms/:id so Express doesn't match "update" as :id
app.put('/api/rooms/update', (req, res) => {
  try {
    const { roomId, documents } = req.body;
    
    console.log('=== ROOM UPDATE REQUEST ===');
    console.log('Received roomId:', roomId, 'Type:', typeof roomId);
    console.log('Received documents count:', documents?.length || 0);

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const data = readDataFile();
    console.log('Total rooms in data.json:', data.rooms.length);
    console.log('Room IDs in data:', data.rooms.map(r => r.id));

    const roomIndex = data.rooms.findIndex(r => {
      console.log('Comparing:', r.id, '===', roomId, 'Result:', r.id === roomId);
      return r.id === roomId;
    });

    console.log('Room found at index:', roomIndex);

    if (roomIndex === -1) {
      console.log('ERROR: Room not found!');
      return res.status(404).json({ error: 'Room not found' });
    }

    // Update documents array
    if (documents && Array.isArray(documents)) {
      data.rooms[roomIndex].documents = documents;
      console.log('Room documents updated. New count:', documents.length);
    }

    if (writeDataFile(data)) {
      console.log('Data file saved successfully');
      res.json({
        success: true,
        message: 'Room updated successfully',
        room: data.rooms[roomIndex]
      });
    } else {
      res.status(500).json({ error: 'Failed to update room' });
    }
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room: ' + error.message });
  }
});

// Terminate room with final times
app.put('/api/rooms/terminate', (req, res) => {
  try {
    const { roomId, endTime, actualEndTime, duration } = req.body;
    
    console.log('=== ROOM TERMINATION REQUEST ===');
    console.log('Received roomId:', roomId);
    console.log('End Time:', endTime);
    console.log('Duration (Elapsed):', duration);
    
    if (!roomId || !endTime || !duration) {
      return res.status(400).json({ error: 'Room ID, end time, and duration are required' });
    }

    const data = readDataFile();
    const roomIndex = data.rooms.findIndex(r => r.id === roomId);

    if (roomIndex === -1) {
      console.log('Room not found with ID:', roomId);
      return res.status(404).json({ error: 'Room not found' });
    }

    console.log('Found room at index:', roomIndex, 'Name:', data.rooms[roomIndex].name);

    // Update room with termination data
    // CRITICAL: Do NOT remove participants - keep full history
    data.rooms[roomIndex] = {
      ...data.rooms[roomIndex],
      endTime: endTime,
      actualEndTime: actualEndTime,
      duration: duration, // This will be the actual elapsed time like "00:15:42"
      isActive: false,
      terminatedAt: new Date().toISOString()
    };

    console.log('Updated room with final data:', {
      id: roomId,
      startTime: data.rooms[roomIndex].startTime,
      endTime: endTime,
      duration: duration,
      participantCount: data.rooms[roomIndex].participants.length
    });

    if (writeDataFile(data)) {
      console.log('Room terminated and saved successfully');
      res.json({
        success: true,
        message: 'Room terminated successfully',
        room: data.rooms[roomIndex]
      });
    } else {
      console.error('Failed to save terminated room data');
      res.status(500).json({ error: 'Failed to terminate room' });
    }
  } catch (error) {
    console.error('Error terminating room:', error);
    res.status(500).json({ error: 'Failed to terminate room: ' + error.message });
  }
});

// Update room (add message, participant, etc.)
app.put('/api/rooms/:id', (req, res) => {
  const data = readDataFile();
  const roomIndex = data.rooms.findIndex(r => r.id === req.params.id);

  if (roomIndex === -1) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Merge updates
  data.rooms[roomIndex] = { ...data.rooms[roomIndex], ...req.body };

  if (writeDataFile(data)) {
    res.json({
      success: true,
      message: 'Room updated successfully',
      room: data.rooms[roomIndex]
    });
  } else {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Update user avatar
app.put('/api/users/:id', (req, res) => {
  const data = readDataFile();
  const userIndex = data.users.findIndex(u => u.id === parseInt(req.params.id));

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  data.users[userIndex] = { ...data.users[userIndex], ...req.body };

  if (writeDataFile(data)) {
    res.json({
      success: true,
      message: 'User updated successfully',
      user: data.users[userIndex]
    });
  } else {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Document upload multer configuration - use simple uploads folder first
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for documents
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', file.originalname, 'MIME type:', file.mimetype);
    
    // Accept common document formats
    const allowedMimes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
      'text/plain', // .txt
      'application/zip', // .zip
      'application/x-zip-compressed', // .zip (alternative)
      'application/x-rar-compressed', // .rar
      'image/jpeg', // .jpg
      'image/png', // .png
      'image/gif', // .gif
      'image/webp' // .webp
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      console.log('✅ File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('❌ File rejected:', file.originalname, 'MIME:', file.mimetype);
      cb(new Error(`File type ${file.mimetype} is not allowed. Accepted types: PDF, Word, Excel, PowerPoint, images, zip`));
    }
  }
});

// Document upload endpoint
app.post('/api/upload-document', documentUpload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { roomId } = req.body;
    
    console.log('Document upload - Received roomId:', roomId, 'Type:', typeof roomId);

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const document = {
      name: req.file.originalname,
      type: req.file.originalname.split('.').pop(),
      url: fileUrl,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    
    // Broadcast document upload to all participants in the room
    io.to(roomId).emit('document-uploaded', { document });
    
    res.json({
      success: true,
      filename: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      uploadedAt: document.uploadedAt,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document: ' + error.message });
  }
});

// ============ RECORDING UPLOAD ============

// Create recordings directory
const recordingsDir = path.join(__dirname, 'uploads', 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname || '.webm'));
  }
});

const recordingUpload = multer({
  storage: recordingStorage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for recordings
});

// Upload recording endpoint
app.post('/api/upload-recording', recordingUpload.single('recording'), async (req, res) => {
  console.log('📥 Recording upload request received:', { roomId: req.body?.roomId, hasFile: !!req.file, fileSize: req.file?.size });
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No recording uploaded' });
    }

    const { roomId, duration } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const fileUrl = `/uploads/recordings/${req.file.filename}`;
    const recording = {
      url: fileUrl,
      duration: duration || '0:00:00',
      currentTime: '0:00:00',
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    // Update room in data.json with recording info
    const data = readDataFile();
    const roomIndex = data.rooms.findIndex(r => r.id === roomId);

    if (roomIndex !== -1) {
      data.rooms[roomIndex].recording = recording;
      writeDataFile(data);
      console.log('✅ Recording saved for room:', roomId, 'File:', req.file.filename, 'Size:', req.file.size);

      // Trigger AI transcription + summarization in the background
      transcribeAndSummarize(roomId, req.file.path).catch(err => {
        console.error('Background AI processing failed:', err.message);
      });
    }

    res.json({
      success: true,
      recording,
      message: 'Recording uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({ error: 'Failed to upload recording: ' + error.message });
  }
});

// Serve recording files
app.get('/api/recording/:roomId', (req, res) => {
  const data = readDataFile();
  const room = data.rooms.find(r => r.id === req.params.roomId);
  if (room && room.recording && room.recording.url) {
    const filePath = path.join(__dirname, room.recording.url);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Recording file not found' });
    }
  } else {
    res.status(404).json({ error: 'No recording for this room' });
  }
});

// ============ AI TRANSCRIPTION & SUMMARIZATION ============

// --------------- Gemini provider ---------------
async function transcribeWithGemini(base64Audio, mimeType) {
  if (!genAI) throw new Error('Gemini API key not configured');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Audio } },
    { text: 'Please transcribe this audio recording accurately. Include all spoken words. If multiple speakers are detected, label them as Speaker 1, Speaker 2, etc. If no speech is detected or the audio is silent, respond with "No speech detected in the recording."' }
  ]);
  return result.response.text();
}

async function summarizeWithGemini(transcript, room) {
  if (!genAI) throw new Error('Gemini API key not configured');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const participantNames = (room.participants || []).map(p => p.name).join(', ');
  const hostName = (room.participants || []).find(p => p.isHost)?.name || 'Unknown';
  const result = await model.generateContent([{
    text: `You are summarizing a meeting/voice call. Here are the meeting details:

Meeting Name: "${room.name}"
Date: ${room.date || 'N/A'}
Duration: ${room.duration || 'N/A'}
Host: ${hostName}
Participants: ${participantNames}

Transcript of the call:
---
${transcript}
---

Please provide a clear, structured summary of this meeting that includes:
1. Main topics discussed
2. Key points and decisions made
3. Action items (if any)
4. A brief overall summary

Keep it concise but informative. Format it nicely with sections.`
  }]);
  return result.response.text();
}

// --------------- Groq provider (fallback) ---------------
async function transcribeWithGroq(audioFilePath) {
  if (!groq) throw new Error('Groq API key not configured');
  const audioStream = fs.createReadStream(audioFilePath);
  const result = await groq.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-large-v3-turbo',
    response_format: 'text',
  });
  return typeof result === 'string' ? result : result.text || JSON.stringify(result);
}

async function summarizeWithGroq(transcript, room) {
  if (!groq) throw new Error('Groq API key not configured');
  const participantNames = (room.participants || []).map(p => p.name).join(', ');
  const hostName = (room.participants || []).find(p => p.isHost)?.name || 'Unknown';
  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `You are summarizing a meeting/voice call. Here are the meeting details:

Meeting Name: "${room.name}"
Date: ${room.date || 'N/A'}
Duration: ${room.duration || 'N/A'}
Host: ${hostName}
Participants: ${participantNames}

Transcript of the call:
---
${transcript}
---

Please provide a clear, structured summary of this meeting that includes:
1. Main topics discussed
2. Key points and decisions made
3. Action items (if any)
4. A brief overall summary

Keep it concise but informative. Format it nicely with sections.`
    }],
    temperature: 0.3,
    max_tokens: 2048
  });
  return result.choices[0]?.message?.content || 'No summary generated';
}

// --------------- Main orchestrator ---------------
async function transcribeAndSummarize(roomId, audioFilePath) {
  try {
    console.log('🤖 Starting AI transcription for room:', roomId);
    const data = readDataFile();
    const roomIndex = data.rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return;

    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString('base64');
    const mimeType = audioFilePath.endsWith('.ogg') ? 'audio/ogg' : 'audio/webm';
    const room = data.rooms[roomIndex];

    let transcript = null;
    let aiSummary = null;
    let provider = 'unknown';

    // Try Gemini first
    if (genAI) {
      try {
        console.log('  📡 Trying Gemini...');
        transcript = await transcribeWithGemini(base64Audio, mimeType);
        aiSummary = await summarizeWithGemini(transcript, room);
        provider = 'Gemini';
      } catch (geminiErr) {
        console.warn('  ⚠️ Gemini failed:', geminiErr.message?.substring(0, 120));
      }
    }

    // Fall back to Groq
    if (!transcript && groq) {
      try {
        console.log('  📡 Trying Groq (fallback)...');
        transcript = await transcribeWithGroq(audioFilePath);
        aiSummary = await summarizeWithGroq(transcript, room);
        provider = 'Groq';
      } catch (groqErr) {
        console.warn('  ⚠️ Groq failed:', groqErr.message?.substring(0, 120));
      }
    }

    // If we got a transcript but summarization failed, try cross-provider summarization
    if (transcript && !aiSummary) {
      try {
        if (groq) aiSummary = await summarizeWithGroq(transcript, room);
        else if (genAI) aiSummary = await summarizeWithGemini(transcript, room);
      } catch (e) {
        console.warn('  ⚠️ Cross-provider summarization failed:', e.message?.substring(0, 80));
      }
    }

    if (!transcript) {
      throw new Error(
        !genAI && !groq
          ? 'No AI API keys configured. Add GEMINI_API_KEY or GROQ_API_KEY to backend/.env (Groq is free: https://console.groq.com)'
          : 'All AI providers failed. Check your API keys and quotas.'
      );
    }

    console.log(`📝 Transcription complete via ${provider} for room:`, roomId, '- Length:', transcript.length, 'chars');

    let fullSummary = '';
    if (aiSummary) {
      fullSummary = `=== AI-Generated Meeting Summary (${provider}) ===\n\n`;
      fullSummary += aiSummary;
      fullSummary += `\n\n=== Full Transcript ===\n\n`;
      fullSummary += transcript;
    } else {
      fullSummary = `=== Full Transcript ===\n\n${transcript}\n\n(AI summarization was unavailable — transcript only)`;
    }

    const freshData = readDataFile();
    const freshRoomIndex = freshData.rooms.findIndex(r => r.id === roomId);
    if (freshRoomIndex !== -1) {
      freshData.rooms[freshRoomIndex].summary = fullSummary;
      freshData.rooms[freshRoomIndex].transcript = transcript;
      writeDataFile(freshData);
      console.log('✅ AI summary & transcript saved for room:', roomId);
    }
  } catch (error) {
    console.error('❌ AI transcription error for room', roomId, ':', error.message);
    try {
      const data = readDataFile();
      const roomIndex = data.rooms.findIndex(r => r.id === roomId);
      if (roomIndex !== -1) {
        const room = data.rooms[roomIndex];
        data.rooms[roomIndex].summary = generateFallbackSummary(room, error.message);
        writeDataFile(data);
        console.log('⚠️ Fallback summary saved for room:', roomId);
      }
    } catch (e) {
      console.error('Fallback summary also failed:', e.message);
    }
  }
}

// Fallback summary when AI is unavailable
function generateFallbackSummary(room, errorReason) {
  const participantNames = (room.participants || []).map(p => p.name).join(', ');
  const hostName = (room.participants || []).find(p => p.isHost)?.name || 'Unknown';
  const messageCount = (room.messages || []).length;
  const documentCount = (room.documents || []).length;

  let summary = `Meeting: "${room.name}"\n`;
  summary += `Date: ${room.date || 'N/A'}\n`;
  summary += `Duration: ${room.duration || '00:00:00'}\n`;
  summary += `Host: ${hostName}\n`;
  summary += `Participants (${(room.participants || []).length}): ${participantNames}\n\n`;
  summary += `Chat Messages: ${messageCount}\n`;
  summary += `Documents Shared: ${documentCount}\n\n`;
  summary += `⚠️ AI transcription was unavailable (${errorReason}).\n`;
  summary += `The recording is available for manual playback in the history section.`;

  return summary;
}

// Manual summarize endpoint — triggers AI transcription if recording exists
app.post('/api/rooms/:id/summarize', async (req, res) => {
  try {
    const data = readDataFile();
    const roomIndex = data.rooms.findIndex(r => r.id === req.params.id);

    if (roomIndex === -1) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = data.rooms[roomIndex];

    // If recording exists, use AI transcription
    if (room.recording && room.recording.url) {
      const audioFilePath = path.join(__dirname, room.recording.url);
      if (fs.existsSync(audioFilePath)) {
        res.json({ success: true, summary: 'AI transcription & summarization started. Please refresh in a few seconds.', processing: true });
        // Run in background
        transcribeAndSummarize(req.params.id, audioFilePath).catch(err => {
          console.error('Manual summarize failed:', err.message);
        });
        return;
      }
    }

    // No recording — generate fallback
    const summary = generateFallbackSummary(room, 'No recording available');
    data.rooms[roomIndex].summary = summary;
    writeDataFile(data);

    res.json({
      success: true,
      summary,
      message: 'Summary generated successfully'
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary: ' + error.message });
  }
});

// Update room documents

// Delete document from room
app.delete('/api/documents/:roomId/:filename', (req, res) => {
  try {
    const { roomId, filename } = req.params;
    
    if (!roomId || !filename) {
      return res.status(400).json({ error: 'Room ID and filename are required' });
    }

    // Delete file from disk
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from room documents array in data.json
    const data = readDataFile();
    const roomIndex = data.rooms.findIndex(r => r.id === roomId);

    if (roomIndex !== -1) {
      data.rooms[roomIndex].documents = data.rooms[roomIndex].documents.filter(
        doc => doc.url !== `/uploads/${filename}`
      );

      if (writeDataFile(data)) {
        res.json({
          success: true,
          message: 'Document deleted successfully'
        });
      } else {
        res.status(500).json({ error: 'Failed to update room after deletion' });
      }
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document: ' + error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// YouTube Search Endpoint
app.get('/api/youtube/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.json({ success: true, videos: [] });
    }

    // Search YouTube using yt-search package
    const results = await search(query);
    
    if (results && results.videos && results.videos.length > 0) {
      // Extract video data from results
      const videos = results.videos.slice(0, 20).map(video => ({
        id: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        url: `https://www.youtube.com/embed/${video.videoId}`,
        channel: video.author ? video.author.name : 'Unknown',
        description: video.description || '',
        duration: video.duration || 'N/A',
        views: video.views || 0
      }));

      res.json({ success: true, videos });
    } else {
      res.json({ success: true, videos: [] });
    }

  } catch (error) {
    console.error('YouTube search error:', error);
    res.json({ success: false, videos: [], error: 'Failed to search YouTube' });
  }
});

// Socket.io connection handling
const roomUsers = new Map(); // roomId -> Set of socketIds
const socketToRoom = new Map(); // socketId -> roomId
const socketToUser = new Map(); // socketId -> userId
const roomState = new Map(); // roomId -> { youtube: {...}, whiteboard: {...}, participants: [...] }

// Helper function to calculate elapsed time (top-level so it's shared)
const calculateElapsedTime = (startTimeISO) => {
  const start = new Date(startTimeISO);
  const now = new Date();
  const diff = Math.floor((now - start) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Broadcast elapsed time updates every second for active rooms (single global interval)
const elapsedTimerInterval = setInterval(() => {
  const data = readDataFile();
  data.rooms.forEach(room => {
    if (!room.endTime && room.actualStartTime) {
      const elapsed = calculateElapsedTime(room.actualStartTime);
      io.to(room.id).emit('elapsed-time-update', { elapsed });
    }
  });
}, 1000);

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);
    socketToUser.set(socket.id, userId);

    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(socket.id);

    // Update room participants in database
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    // Look up avatar from user record
    const user = data.users.find(u => u.id === userId);
    const avatar = user?.avatar || null;
    if (room) {
      const participantExists = room.participants.some(p => p.id === userId);
      if (!participantExists) {
        room.participants.push({
          id: userId,
          name: userName,
          avatar,
          isHost: room.hostId === userId
        });
        room.participantCount = room.participants.length;
        writeDataFile(data);
      } else {
        // Update avatar if it changed
        const participant = room.participants.find(p => p.id === userId);
        if (participant && participant.avatar !== avatar) {
          participant.avatar = avatar;
          writeDataFile(data);
        }
      }
    }

    // Send synchronized room time to new participant
    if (room) {
      const startTimeISO = room.actualStartTime || room.createdAt || new Date().toISOString();
      socket.emit('room-time', {
        startTime: room.startTime,
        startTimeISO: startTimeISO
      });
      
      // Calculate and send current elapsed time
      const elapsed = calculateElapsedTime(startTimeISO);
      socket.emit('elapsed-time-update', { elapsed });

      // Send current YouTube state if any
      if (roomState.has(roomId) && roomState.get(roomId).youtube) {
        const youtubeState = roomState.get(roomId).youtube;
        socket.emit('youtube-sync', youtubeState);
      }
    }

    // Send list of existing peers in the room for WebRTC connections
    const existingPeers = Array.from(roomUsers.get(roomId) || []).filter(id => id !== socket.id);
    if (existingPeers.length > 0) {
      socket.emit('existing-peers', { peers: existingPeers });
      // Tell existing peers about the new participant
      existingPeers.forEach(peerId => {
        io.to(peerId).emit('new-peer-joined', { peerId: socket.id });
      });
    }

    // Notify others in room
    socket.to(roomId).emit('user-joined', { userId, userName, socketId: socket.id });
    io.to(roomId).emit('room-participants', {
      participants: room?.participants || [],
      count: room?.participantCount || 0
    });

    console.log(`User ${userName} (${userId}) joined room ${roomId}`);
  });

  // Re-request existing peers (handles race condition where initial event was missed)
  socket.on('request-existing-peers', ({ roomId }) => {
    if (!roomId) return;
    const existingPeers = Array.from(roomUsers.get(roomId) || []).filter(id => id !== socket.id);
    console.log(`🔄 Peer re-request for room ${roomId}: [${existingPeers.join(', ')}]`);
    if (existingPeers.length > 0) {
      socket.emit('existing-peers', { peers: existingPeers });
    }
  });

  // Get participants list
  socket.on('get-participants', ({ roomId }) => {
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
      socket.emit('room-participants', {
        participants: room.participants || [],
        count: room.participantCount || 0
      });
    }
  });

  // Get room time
  socket.on('get-room-time', ({ roomId }) => {
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
      const startTimeISO = room.actualStartTime || room.createdAt || new Date().toISOString();
      socket.emit('room-time', {
        startTime: room.startTime,
        startTimeISO: startTimeISO
      });
      
      const elapsed = calculateElapsedTime(startTimeISO);
      socket.emit('elapsed-time-update', { elapsed });
    }
  });

  // Host terminate room
  socket.on('host-terminate-room', ({ roomId }) => {
    const userId = socketToUser.get(socket.id);
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    
    if (room && room.hostId === userId) {
      // Update room with end time and duration
      const endTime = new Date();
      const startTimeISO = room.actualStartTime || room.createdAt || new Date().toISOString();
      const elapsed = calculateElapsedTime(startTimeISO);
      
      const formattedEndTime = endTime.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      room.endTime = formattedEndTime;
      room.duration = elapsed;
      room.isActive = false;
      room.terminatedAt = endTime.toISOString();

      // Auto-generate fallback summary on termination only if no AI summary is being generated
      // (the recording upload endpoint triggers AI summarization in the background)
      if (!room.recording || !room.recording.url) {
        room.summary = generateFallbackSummary(room, 'Recording not yet uploaded');
      }
      
      writeDataFile(data);
      console.log(`✅ Room ${roomId} terminated and saved to data.json:`, {
        endTime: formattedEndTime,
        duration: elapsed,
        isActive: false
      });
      
      // Clear room state
      roomState.delete(roomId);
      
      // Broadcast termination to all participants
      io.to(roomId).emit('room-terminated', { isHostTermination: true });
      console.log(`Host ${userId} terminated room ${roomId}`);
    }
  });

  // Sync room state to all participants
  socket.on('sync-room-state', ({ roomId }) => {
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
      socket.emit('room-state-sync', {
        room: room,
        participants: room.participants || [],
        documents: room.documents || [],
        messages: room.messages || []
      });
    }
  });

  // Leave room
  socket.on('leave-room', ({ roomId, userId }) => {
    socket.leave(roomId);
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(socket.id);
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId);
      }
    }
    socketToRoom.delete(socket.id);
    socketToUser.delete(socket.id);

    socket.to(roomId).emit('user-left', { userId });
    
    // Update and broadcast participant list
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
      // CRITICAL: Only update participant count, but KEEP participants list
      // This preserves room history - participants are never removed from completed rooms
      if (!room.isActive && room.endTime) {
        // Room is already ended - don't modify participants at all
        console.log(`User ${userId} left completed room ${roomId} - preserving history`);
      } else {
        // Room is still active - update active participant count if needed
        // But we should keep participants in the array for history
        console.log(`User ${userId} left active room ${roomId}`);
      }
      
      // Always save to ensure consistency
      writeDataFile(data);
      
      io.to(roomId).emit('room-participants', {
        participants: room.participants,
        count: room.participants.length
      });
    }
    
    console.log(`User ${userId} left room ${roomId}`);
  });

  // Send message
  socket.on('send-message', ({ roomId, userId, userName, message }) => {
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    if (room) {
      // Look up avatar from user record
      const user = data.users.find(u => u.id === userId);
      const avatar = user?.avatar || null;
      const newMessage = {
        id: room.messages.length + 1,
        userId,
        userName,
        avatar,
        message,
        timestamp: new Date().toISOString()
      };
      room.messages.push(newMessage);
      writeDataFile(data);

      // Broadcast to all in room
      io.to(roomId).emit('new-message', newMessage);
    }
  });

  // Whiteboard sync (Host only - draw)
  socket.on('whiteboard-draw', ({ roomId, data: drawData }) => {
    const userId = socketToUser.get(socket.id);
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    
    // Only host can draw
    if (room && room.hostId === userId) {
      // Store in room state for late joiners
      if (!roomState.has(roomId)) {
        roomState.set(roomId, {});
      }
      const state = roomState.get(roomId);
      if (!state.whiteboard) {
        state.whiteboard = [];
      }
      state.whiteboard.push(drawData);
      
      // Broadcast to all participants
      io.to(roomId).emit('whiteboard-draw', drawData);
      console.log(`Host drew on whiteboard in room ${roomId}`);
    } else {
      console.log(`Non-host user ${userId} attempted to draw in room ${roomId} - rejected`);
    }
  });

  socket.on('whiteboard-clear', ({ roomId }) => {
    const userId = socketToUser.get(socket.id);
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    
    // Only host can clear
    if (room && room.hostId === userId) {
      // Clear whiteboard state
      if (roomState.has(roomId)) {
        const state = roomState.get(roomId);
        state.whiteboard = [];
      }
      
      // Broadcast clear to all participants
      io.to(roomId).emit('whiteboard-clear');
      console.log(`Host cleared whiteboard in room ${roomId}`);
    } else {
      console.log(`Non-host user ${userId} attempted to clear whiteboard in room ${roomId} - rejected`);
    }
  });

  // YouTube sync (Host only - play/pause/seek)
  socket.on('youtube-play', ({ roomId, videoId, title, url, channel, currentTime, hostId }) => {
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    
    console.log(`\n🎬 YouTube play event received from host:`);
    console.log(`   Room: ${roomId}, Video: ${videoId}, Host: ${hostId}`);
    
    // Only host can control YouTube
    if (room && room.hostId === hostId) {
      // Store YouTube state
      if (!roomState.has(roomId)) {
        roomState.set(roomId, {});
      }
      const state = roomState.get(roomId);
      state.youtube = {
        videoId,
        title,
        url,
        channel: channel || 'Unknown',
        currentTime: currentTime || 0,
        isPlaying: true,
        lastUpdated: Date.now()
      };
      
      // Get all connected sockets in this room
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      const participantCount = roomSockets ? roomSockets.size : 0;
      
      console.log(`🎥 Broadcasting to ${participantCount} users in room ${roomId}`);
      console.log(`   Payload:`, state.youtube);
      
      // Broadcast play command to ALL participants in room (including host)
      io.to(roomId).emit('youtube-sync', state.youtube);
      
      console.log(`✅ youtube-sync event emitted successfully\n`);
    } else {
      console.log(`❌ Unauthorized YouTube play attempt - Host mismatch\n`);
    }
  });

  socket.on('youtube-pause', ({ roomId }) => {
    const userId = socketToUser.get(socket.id);
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    
    // Only host can pause
    if (room && room.hostId === userId) {
      // Update YouTube state
      if (roomState.has(roomId) && roomState.get(roomId).youtube) {
        roomState.get(roomId).youtube.isPlaying = false;
        roomState.get(roomId).youtube.lastUpdated = Date.now();
      }
      
      // Broadcast pause to participants
      io.to(roomId).emit('youtube-pause');
      console.log(`Host paused YouTube in room ${roomId}`);
    } else {
      console.log(`Non-host user ${userId} attempted to pause YouTube in room ${roomId} - rejected`);
    }
  });

  socket.on('youtube-seek', ({ roomId, currentTime }) => {
    const userId = socketToUser.get(socket.id);
    const data = readDataFile();
    const room = data.rooms.find(r => r.id === roomId);
    
    // Only host can seek
    if (room && room.hostId === userId) {
      // Update YouTube state
      if (roomState.has(roomId) && roomState.get(roomId).youtube) {
        roomState.get(roomId).youtube.currentTime = currentTime;
        roomState.get(roomId).youtube.lastUpdated = Date.now();
      }
      
      // Broadcast seek to participants
      io.to(roomId).emit('youtube-seek', { currentTime });
      console.log(`Host seeked to ${currentTime}s in room ${roomId}`);
    } else {
      console.log(`Non-host user ${userId} attempted to seek YouTube in room ${roomId} - rejected`);
    }
  });

  // Participant requests YouTube sync (sent when joining)
  socket.on('youtube-sync-request', ({ roomId }) => {
    // Send current YouTube state if available
    if (roomState.has(roomId) && roomState.get(roomId).youtube) {
      const youtubeState = roomState.get(roomId).youtube;
      socket.emit('youtube-sync', youtubeState);
      console.log(`✅ Sent YouTube sync state to user in room ${roomId}:`, youtubeState);
    } else {
      console.log(`⏭️ No YouTube state for room ${roomId}, sending empty state`);
      socket.emit('youtube-sync', { videoId: null, currentTime: 0, isPlaying: false });
    }
  });

  // WebRTC signaling
  socket.on('webrtc-offer', ({ roomId, offer, targetSocketId }) => {
    socket.to(targetSocketId).emit('webrtc-offer', { offer, fromSocketId: socket.id });
  });

  socket.on('webrtc-answer', ({ roomId, answer, targetSocketId }) => {
    socket.to(targetSocketId).emit('webrtc-answer', { answer, fromSocketId: socket.id });
  });

  socket.on('webrtc-ice-candidate', ({ roomId, candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit('webrtc-ice-candidate', { candidate, fromSocketId: socket.id });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    const userId = socketToUser.get(socket.id);

    if (roomId) {
      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);
        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
        }
      }
      socket.to(roomId).emit('user-left', { userId });
    }

    socketToRoom.delete(socket.id);
    socketToUser.delete(socket.id);
    console.log('❌ User disconnected:', socket.id);
  });
});

// Kill any existing process on port before starting (prevents EADDRINUSE)
try {
  const result = execSync(`netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`, { encoding: 'utf-8' });
  const pids = new Set();
  result.trim().split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0' && pid !== String(process.pid)) pids.add(pid);
  });
  pids.forEach(pid => {
    try { execSync(`taskkill /PID ${pid} /F`); console.log(`🛑 Killed stale process ${pid} on port ${PORT}`); } catch (e) { /* ignore */ }
  });
  // Brief wait for port to fully release
  if (pids.size > 0) execSync('timeout /t 2 /nobreak >nul 2>&1', { shell: true });
} catch (e) { /* No process on port — all good */ }

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on ${BACKEND_URL}`);
  console.log(`🔌 Socket.io server ready`);
  console.log(`📁 Uploads folder: ${uploadsDir}`);
  console.log(`📄 Data file: ${dataFilePath}`);
});

// Graceful shutdown for --watch mode (prevents EADDRINUSE on restart)
const gracefulShutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  clearInterval(elapsedTimerInterval);
  io.close();
  httpServer.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 2000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
