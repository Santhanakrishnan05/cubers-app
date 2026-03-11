import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Profile = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    setCurrentUser,
    data,
    setData,
    profileEditData,
    setProfileEditData,
    pendingProfileImage,
    setPendingProfileImage,
    fileInputRefProfile,
    handleImageUpload,
    handleLogout
  } = useApp();

  const onLogout = () => {
    handleLogout();
    navigate('/');
  };

  const handleUpdateProfile = async () => {
    const updatedUser = {
      ...currentUser,
      name: profileEditData?.name || currentUser.name,
      email: profileEditData?.email || currentUser.email,
      phone: profileEditData?.phone || currentUser.phone,
      password: profileEditData?.password || currentUser.password,
      ...(pendingProfileImage && { avatar: pendingProfileImage })
    };

    try {
      // Send update to backend
      const response = await fetch(`http://localhost:5000/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          password: updatedUser.password,
          ...(pendingProfileImage && { avatar: pendingProfileImage })
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state with backend response
        setCurrentUser(result.user);
        setData({
          ...data,
          users: data.users.map(u => u.id === currentUser.id ? result.user : u)
        });
        localStorage.setItem('cubersCurrentUser', JSON.stringify(result.user));
        setProfileEditData(null);
        setPendingProfileImage(null);
        alert('Profile updated successfully!');
        navigate('/home');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Error updating profile');
    }
  };

  const handleCancel = () => {
    setProfileEditData(null);
    setPendingProfileImage(null);
    navigate('/home');
  };

  if (!currentUser) {
    navigate('/');
    return null;
  }

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
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {pendingProfileImage || currentUser.avatar ? (
                <img src={pendingProfileImage || currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
            </div>
            <button 
              onClick={() => fileInputRefProfile.current?.click()}
              className="px-6 py-2 rounded-xl bg-slate-600 text-slate-200 hover:bg-slate-500 mt-6"
            >
              Upload
            </button>
            <input
              ref={fileInputRefProfile}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files?.[0], false)}
              className="hidden"
            />
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-slate-200 mb-2">Name :</label>
              <input
                type="text"
                value={profileEditData?.name || currentUser.name}
                onChange={(e) => setProfileEditData({ ...profileEditData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-700 text-slate-200 border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-200 mb-2">Email :</label>
              <input
                type="email"
                value={profileEditData?.email || currentUser.email}
                onChange={(e) => setProfileEditData({ ...profileEditData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-700 text-slate-200 border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-200 mb-2">Phone number :</label>
              <input
                type="tel"
                value={profileEditData?.phone || currentUser.phone}
                onChange={(e) => setProfileEditData({ ...profileEditData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-700 text-slate-200 border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-200 mb-2">Password :</label>
              <input
                type="password"
                value={profileEditData?.password || currentUser.password}
                onChange={(e) => setProfileEditData({ ...profileEditData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-700 text-slate-200 border border-slate-600"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onLogout}
              className="px-6 py-3 rounded-xl bg-slate-900 text-slate-200 font-semibold hover:bg-slate-800"
            >
              Log Out
            </button>
            <button 
              onClick={handleUpdateProfile}
              className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-900 font-semibold hover:bg-white"
            >
              Update
            </button>
            <button 
              onClick={handleCancel}
              className="px-6 py-3 rounded-xl bg-slate-900 text-slate-200 font-semibold hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
