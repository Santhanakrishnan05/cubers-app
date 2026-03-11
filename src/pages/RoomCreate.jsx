import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RoomCreate = () => {
  const navigate = useNavigate();
  const {
    newRoomName,
    setNewRoomName,
    handleCreateRoom
  } = useApp();

  const onCreateRoom = async () => {
    const room = await handleCreateRoom();
    if (room) {
      navigate(`/room/${room.id}`);
    }
  };

  const onCancel = () => {
    setNewRoomName('');
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
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

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Create New Room</h2>
            <p className="text-slate-400">Enter a name for your new room</p>
          </div>
          
          <input
            type="text"
            placeholder="Enter the room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="w-full px-6 py-3 rounded-2xl bg-slate-700 text-white placeholder-slate-400 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
          
          <div className="flex gap-4">
            <button 
              onClick={onCreateRoom}
              disabled={!newRoomName.trim()}
              className="flex-1 py-3 rounded-2xl bg-slate-200 text-slate-900 font-semibold hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button 
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-slate-900 text-slate-200 font-semibold hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreate;
