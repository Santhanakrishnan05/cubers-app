import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');

const normalizeResourceUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  // Replace localhost with deployed backend URL when running in production
  if (url.startsWith('http://localhost:5000')) {
    return `${BACKEND_URL}${url.replace('http://localhost:5000', '')}`;
  }
  return url;
};

const normalizeUser = (user) => ({
  ...user,
  avatar: normalizeResourceUrl(user.avatar)
});

const normalizeRoom = (room) => ({
  ...room,
  participants: (room.participants || []).map(normalizeUser),
  messages: room.messages || [],
  documents: (room.documents || []).map((doc) => ({
    ...doc,
    url: normalizeResourceUrl(doc.url)
  })),
  recording: room.recording ? {
    ...room.recording,
    url: normalizeResourceUrl(room.recording.url)
  } : room.recording,
  summary: room.summary || ''
});

// Temporary JSON storage
const initialData = {
  users: [
    {
      id: 1,
      name: "Santhana Krishnan J",
      email: "santhanakrishnan02065@gmail.com",
      phone: "+91 8838658734",
      password: "Krish@123",
      avatar: null
    }
  ],
  rooms: [
    {
      id: "JUO952",
      name: "Maths",
      hostId: 1,
      startTime: "10:02:12",
      endTime: "11:34:45",
      date: "30/09/2025",
      duration: "2 hours",
      participantCount: 65,
      participants: [
        { id: 1, name: "Sanjay mass A", isHost: true },
        { id: 2, name: "Pranav R G", isHost: false },
        { id: 3, name: "Siddtharth B", isHost: false },
        { id: 4, name: "Selvakani dass P", isHost: false },
        { id: 5, name: "Santhana Krishnan J", isHost: false },
        { id: 6, name: "Midhun M", isHost: false },
        { id: 7, name: "Manoj M", isHost: false },
        { id: 8, name: "Gowtham P", isHost: false },
        { id: 9, name: "Suganthan S", isHost: false },
        { id: 10, name: "Ragul S", isHost: false },
        { id: 11, name: "Rahul R", isHost: false },
        { id: 12, name: "MohanRaj A", isHost: false }
      ],
      messages: [
        { id: 1, userId: 1, userName: "Host", message: "Hello guys...", timestamp: new Date() },
        { id: 2, userId: 2, userName: "User", message: "Hii", timestamp: new Date() },
        { id: 3, userId: 3, userName: "User", message: "How are you guys", timestamp: new Date() },
        { id: 4, userId: 1, userName: "Host", message: "I'm fine, let's start the class", timestamp: new Date() }
      ],
      documents: [
        { name: "maths unit 1.pdf", type: "pdf" },
        { name: "maths unit 2.doc", type: "doc" },
        { name: "maths unit 3.ppt", type: "ppt" },
        { name: "maths unit 4.ppt", type: "ppt" },
        { name: "maths unit 5.pdf", type: "pdf" }
      ],
      recording: {
        duration: "1:02:43",
        currentTime: "0:16:13"
      },
      summary: "This topic provides a brief introduction to the key concepts covered in this mathematics lesson. It explains the main ideas in a simplified way to help students understand the purpose of the chapter before moving into detailed explanations.\n\nIn this class, we focus on understanding the core principles, important formulas, and real-life applications related to the topic. The overview highlights what the lesson aims to teach, why it is important, and how it connects to other mathematical concepts. It also outlines the skills students will develop, such as problem-solving, logical thinking, and applying formulas to practical situations."
    }
  ]
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Load data from localStorage or use initialData
  const getInitialData = () => {
    try {
      const savedData = localStorage.getItem('cubersAppData');
      return savedData ? JSON.parse(savedData) : initialData;
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      return initialData;
    }
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [data, setData] = useState(getInitialData);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Login/Register states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  // Room states
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [searchActivity, setSearchActivity] = useState('');
  
  // Room interaction states
  const [currentMessage, setCurrentMessage] = useState('');
  const [showYouTube, setShowYouTube] = useState(false);
  const [youtubeSearch, setYoutubeSearch] = useState('');
  const [currentYoutubeVideo, setCurrentYoutubeVideo] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [registerAvatar, setRegisterAvatar] = useState(null);
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileEditData, setProfileEditData] = useState(null);
  const [pendingProfileImage, setPendingProfileImage] = useState(null);
  
  // Refs for file inputs
  const fileInputRefRegister = useRef(null);
  const fileInputRefProfile = useRef(null);
  const fileInputRefDocuments = useRef(null);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cubersAppData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }, [data]);

  // Load data from backend on app start
  useEffect(() => {
    // Fetch all data from backend
    Promise.all([
      fetch(`${BACKEND_URL}/api/users`).then(res => res.json()),
      fetch(`${BACKEND_URL}/api/rooms`).then(res => res.json())
    ])
      .then(([usersResult, roomsResult]) => {
        if (usersResult.success && roomsResult.success) {
          setData({
            users: (usersResult.users || []).map(normalizeUser),
            rooms: (roomsResult.rooms || []).map(normalizeRoom)
          });
        }
      })
      .catch(err => {
        console.error('Error loading data from backend:', err);
      });

    // Check if user is already logged in on app load
    try {
      const savedUser = localStorage.getItem('cubersCurrentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading saved user:', error);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Refresh room data periodically when user is logged in
  // CRITICAL FIX: Always use backend as source of truth
  useEffect(() => {
    if (!currentUser) return;

    const fetchRooms = () => {
      // Use the user-specific endpoint to get rooms they participated in
      const endpoint = `/api/user-room-history/${currentUser.id}`;
      fetch(`${BACKEND_URL}${endpoint}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            // Always use backend as source of truth
            setData(prev => ({
              ...prev,
              rooms: result.rooms
            }));
            console.log(`Loaded ${result.rooms.length} rooms from backend for user ${currentUser.id}`);
          }
        })
        .catch(err => console.error('Error refreshing rooms:', err));
    };

    fetchRooms(); // Fetch immediately
    const refreshInterval = setInterval(fetchRooms, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval);
  }, [currentUser]);

  // Functions
  const handleImageUpload = async (file, isRegister = true) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (isRegister) {
          setRegisterAvatar(result.url);
        } else {
          // For profile: only store the URL, don't update immediately
          setPendingProfileImage(result.url);
          alert('Image selected. Click Update to save changes.');
        }
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading image');
    }
  };

  const handleDocumentUpload = async (file) => {
    if (!file || !selectedRoom) return;

    console.log('Starting document upload for room:', selectedRoom.id, 'Room object:', selectedRoom);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('roomId', selectedRoom.id);
    formData.append('fileName', file.name);

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload-document`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Add document to the room
        const updatedRooms = data.rooms.map(room => 
          room.id === selectedRoom.id 
            ? {
                ...room,
                documents: [
                  ...(room.documents || []),
                  {
                    name: file.name,
                    type: file.name.split('.').pop(),
                    url: result.url,
                    uploadedAt: new Date().toISOString(),
                    size: file.size
                  }
                ]
              }
            : room
        );

        setData({ ...data, rooms: updatedRooms });
        const updatedRoom = updatedRooms.find(r => r.id === selectedRoom.id);
        setSelectedRoom(updatedRoom);

        // Save to backend - wait for confirmation
        console.log('Sending update request with roomId:', selectedRoom.id, 'and', updatedRoom.documents.length, 'documents');
        const updateResponse = await fetch(`${BACKEND_URL}/api/rooms/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: selectedRoom.id,
            documents: updatedRoom.documents
          })
        });

        const updateResult = await updateResponse.json();
        console.log('Backend response:', updateResult);
        if (updateResult.success) {
          alert('Document uploaded and saved successfully!');
        } else {
          alert('Document uploaded but failed to save to history: ' + (updateResult.error || 'Unknown error'));
        }
      } else {
        alert('Failed to upload document: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading document');
    }
  };

  const handleDeleteDocument = async (docUrl, docName) => {
    if (!window.confirm(`Delete "${docName}"?`)) return;

    try {
      const filename = docUrl.split('/').pop();
      const response = await fetch(`${BACKEND_URL}/api/documents/${selectedRoom.id}/${filename}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updatedRooms = data.rooms.map(room =>
          room.id === selectedRoom.id
            ? {
                ...room,
                documents: room.documents.filter(doc => doc.url !== docUrl)
              }
            : room
        );

        setData({ ...data, rooms: updatedRooms });
        setSelectedRoom(updatedRooms.find(r => r.id === selectedRoom.id));
        alert('Document deleted successfully!');
      } else {
        alert('Failed to delete document: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting document');
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      alert('Please enter email and password');
      return false;
    }

    try {
      // Call backend API
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentUser(result.user);
        localStorage.setItem('cubersCurrentUser', JSON.stringify(result.user));
        setLoginEmail('');
        setLoginPassword('');
        alert('Login successful!');
        return true;
      } else {
        alert(result.error || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Connection error. Make sure backend is running on port 5000');
      return false;
    }
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPhone || !registerPassword) {
      alert('Please fill all fields');
      return false;
    }

    try {
      // Call backend API to register
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          avatar: registerAvatar
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Add user to local data
        const updatedData = { ...data, users: [...data.users, result.user] };
        setData(updatedData);
        setCurrentUser(result.user);
        localStorage.setItem('cubersCurrentUser', JSON.stringify(result.user));
        // Reset form
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPhone('');
        setRegisterPassword('');
        setRegisterAvatar(null);
        alert('Account created successfully!');
        return true;
      } else {
        alert(result.error || 'Registration failed');
        return false;
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('Connection error. Make sure backend is running on port 5000');
      return false;
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName || !currentUser) {
      alert('Please enter room name');
      return null;
    }

    try {
      // Call backend API to create room
      const response = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          hostId: currentUser.id,
          hostName: currentUser.name
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Initialize room with elapsed duration format
        const roomWithElapsedDuration = {
          ...result.room,
          duration: "00:00:00" // Initialize with 00:00:00 instead of "2 hours"
        };
        setData({ ...data, rooms: [...data.rooms, roomWithElapsedDuration] });
        setSelectedRoom(roomWithElapsedDuration);
        setShowCreateRoom(false);
        setNewRoomName('');
        alert('Room created successfully!');
        return roomWithElapsedDuration;
      } else {
        alert(result.error || 'Failed to create room');
        return null;
      }
    } catch (err) {
      console.error('Create room error:', err);
      alert('Connection error. Make sure backend is running on port 5000');
      return null;
    }
  };

  const handleJoinRoom = async () => {
    if (!currentUser) {
      alert('Please login first');
      return null;
    }

    try {
      // Fetch all rooms from backend to find the room by code
      const response = await fetch(`${BACKEND_URL}/api/rooms`);
      const result = await response.json();
      
      if (!result.success || !result.rooms) {
        alert('Failed to fetch rooms');
        return null;
      }

      // Find room by ID (room code)
      const room = result.rooms.find(r => r.id === joinRoomCode.toUpperCase());
      
      if (!room) {
        alert(`Room "${joinRoomCode}" not found. Please check the room code.`);
        return null;
      }

      // Check if user is already a participant
      const isParticipant = room.participants && room.participants.some(p => p.id === currentUser.id);
      
      if (!isParticipant) {
        // Add user to participants
        const updatedRoom = {
          ...room,
          participants: [
            ...(room.participants || []),
            {
              id: currentUser.id,
              name: currentUser.name,
              isHost: room.hostId === currentUser.id
            }
          ],
          participantCount: (room.participantCount || room.participants?.length || 0) + 1
        };
        
        // Update backend first
        const updateResponse = await fetch(`${BACKEND_URL}/api/rooms/${room.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participants: updatedRoom.participants,
            participantCount: updatedRoom.participantCount
          })
        });

        const updateResult = await updateResponse.json();
        if (!updateResult.success) {
          alert('Failed to join room');
          return null;
        }

        // Update local data - if room not in data.rooms, add it
        let updatedRooms = data.rooms.map(r => r.id === room.id ? updatedRoom : r);
        if (!updatedRooms.find(r => r.id === room.id)) {
          updatedRooms = [...updatedRooms, updatedRoom];
        }
        setData({ ...data, rooms: updatedRooms });
        setSelectedRoom(updatedRoom);
        setJoinRoomCode('');
        console.log('✅ Successfully joined room:', updatedRoom.id);
        return updatedRoom;
      } else {
        setSelectedRoom(room);
        setJoinRoomCode('');
        alert('You are already in this room');
        return room;
      }
    } catch (err) {
      console.error('Join room error:', err);
      alert('Connection error. Make sure backend is running on port 5000');
      return null;
    }
  };

  const handleSendMessage = () => {
    if (currentMessage && selectedRoom && currentUser) {
      const newMessage = {
        id: selectedRoom.messages.length + 1,
        userId: currentUser.id,
        userName: currentUser.name,
        message: currentMessage,
        timestamp: new Date()
      };
      const updatedRoom = {
        ...selectedRoom,
        messages: [...selectedRoom.messages, newMessage]
      };
      setSelectedRoom(updatedRoom);
      setData({
        ...data,
        rooms: data.rooms.map(r => r.id === selectedRoom.id ? updatedRoom : r)
      });
      setCurrentMessage('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cubersCurrentUser');
    setSelectedRoom(null);
  };

  const handleLeaveRoom = () => {
    setSelectedRoom(null);
  };

  const handleTerminateRoom = async (roomId, endTime, actualEndTime, duration) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms/terminate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          endTime,
          actualEndTime,
          duration,
          isActive: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local room data with actual elapsed time
        const updatedRooms = data.rooms.map(room => 
          room.id === roomId ? {
            ...room,
            endTime,
            actualEndTime,
            duration, // This will now be the real elapsed time like "00:15:42"
            isActive: false
          } : room
        );
        
        setData({ ...data, rooms: updatedRooms });
        console.log(`Room ${roomId} terminated and saved with duration: ${duration}`);
        return true;
      } else {
        console.error('Failed to terminate room:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error terminating room:', error);
      return false;
    }
  };

  // Filter rooms to show room history - include all rooms user participated in
  // CRITICAL FIX: Keep completed rooms in history even after leaving
  const userRooms = currentUser 
    ? data.rooms.filter(room => {
        // Include room if user participated in it (is in participants array)
        if (!room.participants || room.participants.length === 0) return false;
        return room.participants.some(p => p && p.id === currentUser.id);
      })
    : [];

  const filteredRooms = userRooms.filter(room => 
    room.name.toLowerCase().includes(searchActivity.toLowerCase()) ||
    room.id.toLowerCase().includes(searchActivity.toLowerCase())
  );

  // Sort rooms: active first, then by most recent (newest first)
  const sortedFilteredRooms = filteredRooms.sort((a, b) => {
    // Active rooms first
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    
    // Parse dates in format "DD/MM/YYYY" and compare
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Format: DD/MM/YYYY
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      return new Date(dateStr);
    };
    
    const aDate = parseDate(a.date);
    const bDate = parseDate(b.date);
    
    // Most recent first (descending order)
    return bDate - aDate;
  });

  const contextValue = {
    // State
    currentUser,
    setCurrentUser,
    isAuthLoading,
    data,
    setData,
    selectedRoom,
    setSelectedRoom,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    registerName,
    setRegisterName,
    registerEmail,
    setRegisterEmail,
    registerPhone,
    setRegisterPhone,
    registerPassword,
    setRegisterPassword,
    newRoomName,
    setNewRoomName,
    joinRoomCode,
    setJoinRoomCode,
    searchActivity,
    setSearchActivity,
    currentMessage,
    setCurrentMessage,
    showYouTube,
    setShowYouTube,
    youtubeSearch,
    setYoutubeSearch,
    currentYoutubeVideo,
    setCurrentYoutubeVideo,
    showWhiteboard,
    setShowWhiteboard,
    showParticipants,
    setShowParticipants,
    showProfile,
    setShowProfile,
    showCreateRoom,
    setShowCreateRoom,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    registerAvatar,
    setRegisterAvatar,
    profileAvatar,
    setProfileAvatar,
    profileEditData,
    setProfileEditData,
    pendingProfileImage,
    setPendingProfileImage,
    fileInputRefRegister,
    fileInputRefProfile,
    fileInputRefDocuments,
    filteredRooms: sortedFilteredRooms,
    
    // Functions
    handleImageUpload,
    handleDocumentUpload,
    handleDeleteDocument,
    handleLogin,
    handleRegister,
    handleCreateRoom,
    handleJoinRoom,
    handleSendMessage,
    handleLogout,
    handleLeaveRoom,
    handleTerminateRoom
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
