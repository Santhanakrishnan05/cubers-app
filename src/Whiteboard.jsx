import React from 'react';
import { Tldraw } from 'tldraw';
import { useSyncDemo } from '@tldraw/sync';
import 'tldraw/tldraw.css';
import { useApp } from './context/AppContext';

const Whiteboard = ({ roomId }) => {
  const { selectedRoom } = useApp();
  
  // Use the room ID as the unique identifier for the sync demo
  const store = useSyncDemo({ roomId: roomId || selectedRoom?.id || 'default-room' });

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw store={store} />
    </div>
  );
};

export default Whiteboard;
