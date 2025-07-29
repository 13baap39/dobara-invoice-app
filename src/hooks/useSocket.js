/**
 * Socket.io Hook for Real-time Updates
 * Manages WebSocket connection for batch processing notifications
 */

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && token && !socketRef.current) {
      console.log('🔌 Initializing Socket.io connection');
      
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5002', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        forceNew: true
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket.io connected:', newSocket.id);
        setConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket.io disconnected:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket.io connection error:', error);
        setConnected(false);
      });

      newSocket.on('batchUpdate', (data) => {
        console.log('📦 Batch update received:', data);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up Socket.io connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, [user, token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    socket,
    connected
  };
};
