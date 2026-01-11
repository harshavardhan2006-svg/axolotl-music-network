import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private static instance: SocketManager;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private userId: string | null = null;

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(userId: string) {
    console.log('[SocketManager] connect() called with userId:', userId);
    console.log('[SocketManager] Current socket state:', {
      exists: !!this.socket,
      connected: this.socket?.connected,
      id: this.socket?.id
    });

    if (this.socket?.connected) {
      console.log('[SocketManager] Socket already connected, returning existing socket');
      return this.socket;
    }

    this.userId = userId;
    console.log('[SocketManager] Creating new socket connection...');
    this.socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
    console.log('[SocketManager] Socket created, waiting for connection...');
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      if (this.userId) {
        this.socket?.emit('user_connected', this.userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnection();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        if (this.userId) {
          this.connect(this.userId);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  joinHall(hallId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join hall');
      return;
    }
    this.socket.emit('join_hall', hallId);
  }

  leaveHall(hallId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot leave hall');
      return;
    }
    this.socket.emit('leave_hall', hallId);
  }

  sendHallMessage(hallId: string, message: any) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send message');
      return false;
    }
    this.socket.emit('hall_message', { hallId, message });
    return true;
  }

  updateHallPlayback(hallId: string, playbackState: any) {
    if (!this.socket?.connected) return;
    this.socket.emit('hall:update-playback', { hallId, playbackState });
  }

  changeHallSong(hallId: string, song: any) {
    console.log('[SocketManager] changeHallSong called:', {
      hallId,
      songTitle: song.title,
      songId: song._id,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id
    });

    if (!this.socket?.connected) {
      console.error('[SocketManager] Cannot change hall song: Socket not connected');
      console.error('[SocketManager] Socket state:', {
        exists: !!this.socket,
        connected: this.socket?.connected,
        id: this.socket?.id
      });
      return;
    }

    console.log('[SocketManager] Emitting hall:change-song event');
    this.socket.emit('hall:change-song', { hallId, song });
  }

  onHallMessage(callback: (message: any) => void) {
    this.socket?.on('hall_message_received', callback);
  }

  onPlaybackSync(callback: (data: any) => void) {
    this.socket?.on('hall:playback-sync', callback);
  }

  onQueueUpdate(callback: (data: any) => void) {
    this.socket?.on('hall:queue-update', callback);
  }

  onSyncState(callback: (data: any) => void) {
    this.socket?.on('hall:sync-state', callback);
  }

  onSongChanged(callback: (data: any) => void) {
    this.socket?.on('hall:song-changed', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.socket?.disconnect();
    this.socket = null;
    this.userId = null;
  }

  getSocket() {
    return this.socket;
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const socketManager = SocketManager.getInstance();