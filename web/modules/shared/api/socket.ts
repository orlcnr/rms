// ============================================
// SOCKET SERVICE - Real-time updates via Socket.io
// Restaurant bazlı room'lara katılım
// ============================================

import { io, Socket } from 'socket.io-client'
import { create } from 'zustand'

// Environment'den backend URL al
// Socket.io default namespace / olduğu için API path'ini kaldır
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
  // API path'ini kaldır ve sadece host:port al
  const url = new URL(apiUrl);
  return `${url.protocol}//${url.host}`;
};

const SOCKET_URL = getSocketUrl();

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  restaurantId: string | null
  connect: (restaurantId: string) => void
  disconnect: () => void
  emit: (event: string, data: unknown) => void
  on: (event: string, callback: (data: unknown) => void) => void
  off: (event: string) => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  restaurantId: null,

  connect: (restaurantId: string) => {
    const { socket: existingSocket } = get()
    
    // Already connected to the same restaurant
    if (existingSocket?.connected && get().restaurantId === restaurantId) {
      return
    }
    
    // Disconnect from previous if different restaurant
    if (existingSocket?.connected) {
      existingSocket.disconnect()
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    console.log('[Socket] Attempting to connect to:', SOCKET_URL)

    socket.on('connect', () => {
      // Join restaurant room
      socket.emit('join_room', { restaurant_id: restaurantId })
      set({ isConnected: true, restaurantId })
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      set({ isConnected: false })
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error)
    })

    // Debug: Log all incoming events
    socket.on('order_status_updated', (data) => {
      console.log('[Socket] order_status_updated event:', data)
    })

    socket.on('order:updated', (data) => {
      console.log('[Socket] order:updated event:', data)
    })

    socket.on('new_order', (data) => {
      console.log('[Socket] new_order event:', data)
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket, restaurantId } = get()
    if (socket && restaurantId) {
      socket.emit('leave_room', { restaurant_id: restaurantId })
      socket.disconnect()
    }
    set({ socket: null, isConnected: false, restaurantId: null })
  },

  emit: (event: string, data: unknown) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit(event, data)
    }
  },

  on: (event: string, callback: (data: unknown) => void) => {
    const { socket } = get()
    if (socket) {
      socket.on(event, callback)
    }
  },

  off: (event: string) => {
    const { socket } = get()
    if (socket) {
      socket.off(event)
    }
  },
}))

// ============================================
// HOOK: Tables sayfası için
// ============================================

export function useTablesSocket(restaurantId: string) {
  const { connect, disconnect, on, off, isConnected } = useSocketStore()

  return {
    isConnected,
    connect,
    disconnect,
    on,
    off,
  }
}

// ============================================
// HOOK: POS sayfası için
// ============================================

export function usePosSocket(restaurantId: string) {
  const { connect, disconnect, on, off, isConnected } = useSocketStore()

  return {
    isConnected,
    connect,
    disconnect,
    on,
    off,
  }
}
