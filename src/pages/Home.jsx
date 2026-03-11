import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';

const Home = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    newRoomName,
    setNewRoomName,
    joinRoomCode,
    setJoinRoomCode,
    searchActivity,
    setSearchActivity,
    showCreateRoom,
    setShowCreateRoom,
    showProfile,
    setShowProfile,
    handleCreateRoom,
    handleJoinRoom,
    filteredRooms,
    setSelectedRoom,
    profileEditData,
    setProfileEditData,
    pendingProfileImage,
    setPendingProfileImage,
    fileInputRefProfile,
    handleImageUpload,
    handleLogout,
    data,
    setData,
    setCurrentUser
  } = useApp();

  const onCreateRoom = async () => {
    const room = await handleCreateRoom();
    if (room) {
      navigate(`/room/${room.id}`);
    }
  };

  const onJoinRoom = async () => {
    const room = await handleJoinRoom();
    if (room) {
      navigate(`/room/${room.id}`);
    }
  };

  const onViewDetails = (room) => {
    setSelectedRoom(room);
    navigate('/history');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="/Cubers.png" alt="Cubers Logo" className="w-14 h-14 rounded-xl object-contain" />
            <h1 className="text-4xl font-bold text-white">Cubers</h1>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:ring-2 hover:ring-slate-400 transition"
          >
            <Avatar src={currentUser?.avatar} size="lg" />
          </button>
        </div>

        <div className="text-center mb-8">
          <button 
            onClick={() => navigate('/roomCreate')}
            className="px-8 py-4 rounded-2xl bg-slate-600/50 backdrop-blur text-white font-semibold text-lg hover:bg-slate-600 transition border border-slate-500"
          >
            + Create Room
          </button>
        </div>

        <div className="mb-8 flex gap-4 max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Enter the Room Code and Join"
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value)}
            className="flex-1 px-6 py-4 rounded-2xl bg-slate-800/50 backdrop-blur text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-blue-400"
          />
          <button 
            onClick={onJoinRoom}
            className="px-8 py-4 rounded-2xl bg-slate-200 text-slate-900 font-semibold hover:bg-white transition"
          >
            Join
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-300 mb-4">Your Activity</h2>
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search by Room name OR Room ID"
              value={searchActivity}
              onChange={(e) => setSearchActivity(e.target.value)}
              className="w-full px-6 py-4 pr-14 rounded-2xl bg-slate-800/50 backdrop-blur text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-blue-400"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <Search className="w-5 h-5 text-slate-900" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition">
              <div className="text-white font-semibold mb-3 text-lg">{room.name}</div>
              <div className="text-slate-400 text-sm mb-1">Room ID: {room.id}</div>
              
              <div className="bg-slate-900/30 rounded-lg p-3 mb-4 space-y-1">
                <div className="text-slate-300 text-sm">
                  <span className="text-slate-400">Date:</span> <span className="text-white">{room.date}</span>
                </div>
                <div className="text-slate-300 text-sm">
                  <span className="text-slate-400">Start Time:</span> <span className="text-white">{room.startTime}</span>
                </div>
                <div className="text-slate-300 text-sm">
                  <span className="text-slate-400">End Time:</span> <span className="text-white">{room.endTime || "Ongoing"}</span>
                </div>
                <div className="text-slate-300 text-sm">
                  <span className="text-slate-400">Duration:</span> <span className="text-white">{room.duration}</span>
                </div>
              </div>
              
              <button 
                onClick={() => onViewDetails(room)}
                className="w-full py-3 rounded-xl bg-slate-600 text-white font-semibold hover:bg-slate-500 transition"
              >
                Tap to View
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
