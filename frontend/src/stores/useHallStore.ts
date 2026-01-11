import { create } from 'zustand';
import { hallApi, hallMusicApi } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import toast from 'react-hot-toast';

interface Hall {
  _id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  coverImage: string;
  adminId: string | {
    _id: string;
    name: string;
    avatar: string;
  };
  members: Array<{
    _id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string;
  }>;
  memberCount: number;
  onlineCount?: number;
  queueLength: number;
  currentSong?: {
    songId?: {
      _id: string;
      title: string;
      artist: string;
      imageUrl: string;
      duration: number;
      audioUrl: string;
    };
    startedAt?: Date;
    position?: number;
  };
  playbackState?: {
    isPlaying: boolean;
    position: number;
    timestamp: number;
  };
  queue: Array<{
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    duration: number;
  }>;
}

interface HallStore {
  myHalls: Hall[];
  joinedHalls: Hall[];
  discoverHalls: Hall[];
  currentHall: Hall | null;
  isSyncEnabled: boolean;
  isLoading: boolean;
  currentUserId: string | null;
  fetchMyHalls: () => Promise<void>;
  fetchHall: (hallId: string) => Promise<void>;
  fetchDiscoverHalls: (search?: string) => Promise<void>;
  createHall: (hallData: any) => Promise<any>;
  updateHall: (hallId: string, updates: any) => Promise<any>;
  deleteHall: (hallId: string) => Promise<void>;
  leaveHall: (hallId: string) => Promise<void>;
  joinHall: (hallId: string) => Promise<void>;
  toggleSync: (hallId: string) => Promise<void>;
  updateCurrentHall: (updates: Partial<Hall>) => void;
  subscribeToSyncEvents: () => void;
  unsubscribeFromSyncEvents: () => void;
  emitHallPlayback: (playbackState: any) => void;
  emitHallSongChange: (song: any, hallId?: string) => void;
  setCurrentUserId: (userId: string | null) => void;
  lastActionTime: number;
  setLastActionTime: () => void;
  // Optimistic actions
  playSong: (hallId: string, songId: string) => Promise<void>;
  togglePlayback: (hallId: string) => Promise<void>;
  skipToNext: (hallId: string) => Promise<void>;
  removeFromQueue: (hallId: string, queueIndex: number) => Promise<void>;
  seek: (hallId: string, position: number) => Promise<void>;
  addToQueue: (hallId: string, songId: string) => Promise<void>;
}

export const useHallStore = create<HallStore>((set, get) => ({
  myHalls: [],
  joinedHalls: [],
  discoverHalls: [],
  currentHall: null,
  isSyncEnabled: false,
  isLoading: false,
  currentUserId: null,
  lastActionTime: 0,

  setLastActionTime: () => set({ lastActionTime: Date.now() }),

  fetchMyHalls: async () => {
    set({ isLoading: true });
    try {
      const response = await hallApi.getMyHalls();
      set({
        myHalls: response.data.myHalls || [],
        joinedHalls: response.data.joinedHalls || [],
        isLoading: false
      });
    } catch (error: any) {
      console.error('Error fetching halls:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      toast.error('Failed to fetch halls');
      set({ isLoading: false });
    }
  },

  fetchHall: async (hallId: string) => {
    set({ isLoading: true });
    try {
      const response = await hallApi.getHall(hallId);
      const hallData = response.data;

      // Load sync preference from localStorage
      const savedSyncState = localStorage.getItem(`hall_sync_${hallId}`);
      const isSyncEnabled = savedSyncState ? savedSyncState === 'true' : false;

      set({
        currentHall: hallData,
        isLoading: false,
        isSyncEnabled
      });
    } catch (error) {
      console.error('Error fetching hall:', error);
      toast.error('Failed to fetch hall details');
      set({ isLoading: false });
    }
  },

  createHall: async (hallData: any) => {
    try {
      const response = await hallApi.createHall(hallData);
      toast.success('🎉 Hall created successfully!');
      // Refresh halls list after creation
      get().fetchMyHalls();
      return response.data;
    } catch (error: any) {
      console.error('Error creating hall:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create hall';
      toast.error(errorMessage);
      throw error;
    }
  },

  updateHall: async (hallId: string, updates: any) => {
    try {
      const response = await hallApi.updateHall(hallId, updates);
      toast.success('✅ Hall updated successfully!');
      // Update current hall if it's the one being updated
      const { currentHall } = get();
      if (currentHall && currentHall._id === hallId) {
        set({ currentHall: response.data });
      }
      // Refresh halls list
      get().fetchMyHalls();
      return response.data;
    } catch (error: any) {
      console.error('Error updating hall:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update hall';
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteHall: async (hallId: string) => {
    try {
      await hallApi.deleteHall(hallId);
      toast.success('🗑️ Hall deleted successfully!');
      set({ currentHall: null, isSyncEnabled: false });
      // Clear sync preference
      localStorage.removeItem(`hall_sync_${hallId}`);
      // Refresh my halls list
      get().fetchMyHalls();
    } catch (error) {
      console.error('Error deleting hall:', error);
      toast.error('Failed to delete hall');
      throw error;
    }
  },

  leaveHall: async (hallId: string) => {
    try {
      await hallApi.leaveHall(hallId);
      toast.success('👋 Left hall successfully!');
      set({ currentHall: null, isSyncEnabled: false });
      // Clear sync preference
      localStorage.removeItem(`hall_sync_${hallId}`);
    } catch (error) {
      console.error('Error leaving hall:', error);
      toast.error('Failed to leave hall');
      throw error;
    }
  },

  fetchDiscoverHalls: async (search?: string) => {
    const { isLoading } = get();
    if (isLoading) return; // Prevent multiple simultaneous calls

    set({ isLoading: true });
    try {
      const response = await hallApi.discoverHalls(search);
      set({ discoverHalls: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching discover halls:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      toast.error('Failed to fetch halls');
      set({ isLoading: false });
    }
  },

  joinHall: async (hallId: string) => {
    try {
      await hallApi.joinHall(hallId);
      toast.success('🎉 Joined hall successfully!');
      // Refresh discover halls and my halls
      get().fetchDiscoverHalls();
      get().fetchMyHalls();
    } catch (error: any) {
      console.error('Error joining hall:', error);
      const errorMessage = error.response?.data?.message || 'Failed to join hall';
      toast.error(errorMessage);
      throw error;
    }
  },

  toggleSync: async (hallId: string) => {
    try {
      const { isSyncEnabled, currentHall } = get();
      const newSyncState = !isSyncEnabled;

      // Update local state immediately for better UX
      set({ isSyncEnabled: newSyncState });

      if (newSyncState) {
        // When enabling sync, sync to current hall state
        if (currentHall?.currentSong && currentHall?.playbackState) {
          console.log('Syncing to hall audio:', currentHall.currentSong.songId?.title);
          // The AudioPlayer component will handle the actual sync
        }
        toast.success('🎵 Now listening to hall audio');
      } else {
        // When disabling sync, user can control their own music
        console.log('Disabling hall sync');
        toast.success('🔇 Stopped listening to hall audio');
      }

      // Store preference in localStorage
      localStorage.setItem(`hall_sync_${hallId}`, newSyncState.toString());
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error('Failed to toggle sync');
      // Revert state on error
      set({ isSyncEnabled: !get().isSyncEnabled });
      throw error;
    }
  },

  updateCurrentHall: (updates: Partial<Hall>) => {
    const { currentHall } = get();
    if (currentHall) {
      set({ currentHall: { ...currentHall, ...updates } });
    }
  },

  subscribeToSyncEvents: () => {
    const socket = socketManager.getSocket();
    if (!socket) {
      console.error('[HallStore] Cannot subscribe to sync events: Socket not initialized');
      return;
    }

    console.log('[HallStore] Subscribing to sync events on socket:', socket.id);

    socket.on('hall:playback-sync', (playbackState: any) => {
      const { lastActionTime } = get();
      // Ignore events if they are too close to a local action (within 1 second)
      // This prevents "stutter" where the server sends back old state before processing new state
      if (Date.now() - lastActionTime < 1000) {
        console.log('[HallStore] Ignoring playback sync due to recent local action');
        return;
      }

      console.log('[HallStore] Received playback sync:', playbackState);
      // Override server timestamp with client timestamp to avoid clock skew
      const clientPlaybackState = {
        ...playbackState,
        timestamp: Date.now()
      };
      get().updateCurrentHall({ playbackState: clientPlaybackState });
    });

    socket.on('hall:sync-state', (syncState: any) => {
      const { lastActionTime } = get();
      if (Date.now() - lastActionTime < 1000) {
        console.log('[HallStore] Ignoring sync state due to recent local action');
        return;
      }

      console.log('[HallStore] Received initial sync state:', syncState);
      const { currentSong, playbackState } = syncState;

      // Override server timestamp with client timestamp
      const clientPlaybackState = playbackState ? {
        ...playbackState,
        timestamp: Date.now()
      } : undefined;

      if (currentSong) {
        get().updateCurrentHall({
          currentSong: {
            songId: currentSong,
            startedAt: new Date(), // Approximate since we don't get exact start time in sync state
            position: playbackState?.position || 0
          },
          playbackState: clientPlaybackState
        });
      } else {
        get().updateCurrentHall({ playbackState: clientPlaybackState });
      }
    });

    socket.on('hall:song-changed', (song: any) => {
      const { lastActionTime } = get();
      if (Date.now() - lastActionTime < 1000) {
        console.log('[HallStore] Ignoring song change due to recent local action');
        return;
      }

      console.log('[HallStore] Received song change:', song);
      get().updateCurrentHall({
        currentSong: {
          songId: song,
          startedAt: new Date(),
          position: 0
        },
        playbackState: {
          isPlaying: true,
          position: 0,
          timestamp: Date.now() // Client time
        }
      });
    });
  },

  unsubscribeFromSyncEvents: () => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    socket.off('hall:playback-sync');
    socket.off('hall:sync-state');
    socket.off('hall:song-changed');
  },

  emitHallPlayback: (playbackState: any) => {
    const { currentHall } = get();
    if (currentHall) {
      socketManager.updateHallPlayback(currentHall._id, playbackState);
    }
  },

  emitHallSongChange: (song: any, hallId?: string) => {
    const { currentHall } = get();
    const targetHallId = hallId || currentHall?._id;

    console.log('[HallStore] Emitting hall song change:', {
      targetHallId,
      currentHallId: currentHall?._id,
      providedHallId: hallId,
      songTitle: song.title
    });

    if (targetHallId) {
      socketManager.changeHallSong(targetHallId, song);
    } else {
      console.error('[HallStore] Cannot emit song change: No hall ID found');
    }
  },

  setCurrentUserId: (userId: string | null) => {
    console.log('[HallStore] Setting currentUserId:', userId);
    set({ currentUserId: userId });
  },

  // Optimistic Actions Implementation

  playSong: async (hallId: string, songId: string) => {
    get().setLastActionTime(); // Mark action start
    try {
      // Optimistic update could be complex here as we need song details
      // For now, we'll just rely on the API call but we could fetch song details first
      // or pass the full song object if available.
      // Given the signature only has songId, we'll just call the API.
      // Ideally, we should update the UI to show "Loading..." or similar if needed,
      // but for playSong usually a small delay is acceptable or we can assume success.

      await hallMusicApi.playSong(hallId, { songId });
      // The socket event will update the state
    } catch (error) {
      console.error('Error playing song:', error);
      toast.error('Failed to play song');
      throw error;
    }
  },

  togglePlayback: async (hallId: string) => {
    const { currentHall } = get();
    if (!currentHall || !currentHall.playbackState) return;

    get().setLastActionTime(); // Mark action start

    const previousState = { ...currentHall.playbackState };
    const newState = {
      ...previousState,
      isPlaying: !previousState.isPlaying,
      timestamp: Date.now() // Update timestamp to now for accurate sync
    };

    // Optimistic Update
    set({
      currentHall: {
        ...currentHall,
        playbackState: newState
      }
    });

    // Emit socket event IMMEDIATELY for faster updates to others
    socketManager.getSocket()?.emit('hall:update-playback', {
      hallId,
      playbackState: newState
    });

    try {
      await hallMusicApi.togglePlayback(hallId);
    } catch (error) {
      console.error('Error toggling playback:', error);
      toast.error('Failed to toggle playback');
      // Revert
      set({
        currentHall: {
          ...currentHall,
          playbackState: previousState
        }
      });
    }
  },

  skipToNext: async (hallId: string) => {
    const { currentHall } = get();
    if (!currentHall || currentHall.queue.length === 0) return;

    get().setLastActionTime(); // Mark action start

    const previousHallState = JSON.parse(JSON.stringify(currentHall));

    // Get next song
    const nextSong = currentHall.queue[0];
    const newQueue = currentHall.queue.slice(1);

    // Construct new current song object
    const newCurrentSong = {
      songId: {
        _id: nextSong._id,
        title: nextSong.title,
        artist: nextSong.artist,
        imageUrl: nextSong.imageUrl,
        duration: nextSong.duration,
        // Preserve audioUrl if available in queue item (it might not be, but better than empty)
        // If not, we keep it undefined or empty, but AudioPlayer should handle it.
        audioUrl: (nextSong as any).audioUrl || ''
      },
      startedAt: new Date(),
      position: 0
    };

    // Optimistic Update
    set({
      currentHall: {
        ...currentHall,
        currentSong: newCurrentSong as any,
        queue: newQueue,
        queueLength: newQueue.length,
        playbackState: {
          isPlaying: true,
          position: 0,
          timestamp: Date.now()
        }
      }
    });

    try {
      await hallMusicApi.skipToNext(hallId);
    } catch (error) {
      console.error('Error skipping to next:', error);
      toast.error('Failed to skip song');
      // Revert
      set({ currentHall: previousHallState });
    }
  },

  removeFromQueue: async (hallId: string, queueIndex: number) => {
    const { currentHall } = get();
    if (!currentHall) return;

    get().setLastActionTime(); // Mark action start

    const previousQueue = [...currentHall.queue];
    const newQueue = [...currentHall.queue];
    newQueue.splice(queueIndex, 1);

    // Optimistic Update
    set({
      currentHall: {
        ...currentHall,
        queue: newQueue,
        queueLength: newQueue.length
      }
    });

    try {
      await hallMusicApi.removeFromQueue(hallId, queueIndex);
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast.error('Failed to remove song');
      // Revert
      set({
        currentHall: {
          ...currentHall,
          queue: previousQueue,
          queueLength: previousQueue.length
        }
      });
    }
  },

  seek: async (hallId: string, position: number) => {
    const { currentHall } = get();
    if (!currentHall || !currentHall.playbackState) return;

    get().setLastActionTime(); // Mark action start

    const previousState = { ...currentHall.playbackState };

    // Optimistic Update
    set({
      currentHall: {
        ...currentHall,
        playbackState: {
          ...previousState,
          position: position,
          timestamp: Date.now()
        }
      }
    });

    try {
      await hallMusicApi.seek(hallId, { position });
    } catch (error) {
      console.error('Error seeking:', error);
      // Revert not strictly necessary for seek as it updates frequently, 
      // but good for consistency if it fails hard.
      // For seek, maybe we don't revert to avoid jumping back if another update comes in.
      // But let's keep it simple.
    }
  },

  addToQueue: async (hallId: string, songId: string) => {
    // We can't easily do a full optimistic update here because we need song details (title, artist, etc.)
    // which we might not have if we only have the ID. 
    // However, if we assume the caller might have the song object, we could pass it.
    // For now, we'll just do the API call. The user usually doesn't need instant feedback 
    // for "Added to queue" appearing in the list as much as they do for playback controls.
    // But we can at least show the toast immediately if we want, or just rely on the API.

    // Actually, let's just wrap the API call for consistency.
    try {
      await hallMusicApi.addToQueue(hallId, { songId });
      // Socket will update the queue list
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast.error('Failed to add to queue');
      throw error;
    }
  }
}));