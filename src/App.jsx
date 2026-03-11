import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import History from './pages/History';
import RoomCreate from './pages/RoomCreate';
import ActiveRoom from './pages/ActiveRoom';
import './index.css';

const App = () => {
  return (
    <AppProvider>
      <SocketProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          
          <Route path="/roomCreate" element={
            <ProtectedRoute>
              <RoomCreate />
            </ProtectedRoute>
          } />
          
          <Route path="/room/:roomId" element={
            <ProtectedRoute>
              <ActiveRoom />
            </ProtectedRoute>
          } />

          {/* Redirect any unknown routes to home or login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </SocketProvider>
    </AppProvider>
  );
};

export default App;