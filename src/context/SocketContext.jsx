import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useApp } from './AppContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { currentUser, selectedRoom, setCurrentYoutubeVideo } = useApp();
  const [socket, setSocket] = useState(null);
  const currentRoomRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      // Initialize socket connection
      const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const newSocket = io(backendURL, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });
      // const newSocket = io('http://localhost:5000', {
      //   transports: ['polling', 'websocket'],
      //   reconnectionAttempts: 10,
      //   reconnectionDelay: 1000
      // });

      newSocket.on('connect', () => {
        console.log('✅ Connected to Socket.io server, id:', newSocket.id);
        // Trigger state update AFTER connect so consumers get a connected socket
        setSocket(newSocket);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from Socket.io server');
      });

      // Global YouTube sync listener - ALWAYS listen for video changes
      newSocket.on('youtube-sync', (syncData) => {
        console.log('🎬 [SocketContext] YouTube sync received globally:', syncData);
        
        if (syncData && syncData.videoId) {
          const updatedVideo = {
            id: syncData.videoId,
            title: syncData.title || 'Unknown Title',
            channel: syncData.channel || 'Unknown',
            url: syncData.url,
            snippet: {
              title: syncData.title || 'Unknown Title',
              channelTitle: syncData.channel || 'Unknown',
              thumbnails: { default: { url: '' } }
            }
          };
          console.log('✅ [SocketContext] Updating global currentYoutubeVideo');
          setCurrentYoutubeVideo(updatedVideo);
        } else if (syncData && !syncData.videoId) {
          console.log('⏹️ [SocketContext] Clearing currentYoutubeVideo');
          setCurrentYoutubeVideo(null);
        }
      });

      return () => {
        newSocket.off('youtube-sync');
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [currentUser, setCurrentYoutubeVideo]);

  // Join room when selectedRoom ID changes (not the object)
  useEffect(() => {
    if (socket && selectedRoom && currentUser) {
      // Only join if we changed to a different room
      if (currentRoomRef.current !== selectedRoom.id) {
        // Leave previous room
        if (currentRoomRef.current) {
          socket.emit('leave-room', {
            roomId: currentRoomRef.current,
            userId: currentUser.id
          });
        }

        // Join new room
        socket.emit('join-room', {
          roomId: selectedRoom.id,
          userId: currentUser.id,
          userName: currentUser.name
        });
        currentRoomRef.current = selectedRoom.id;
      }
    }
  }, [selectedRoom?.id, currentUser?.id, socket]);

  const value = {
    socket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

