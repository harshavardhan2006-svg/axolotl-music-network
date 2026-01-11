import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music, Volume2, VolumeX } from "lucide-react";
import { useHallStore } from "@/stores/useHallStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { hallMusicApi } from "@/lib/api";
import { audioContextManager } from "@/lib/audioContext";
import { useState, useEffect } from "react";

interface SyncMusicDialogProps {
  open: boolean;
  onClose: () => void;
  hall: {
    _id: string;
    currentSong?: {
      songId?: {
        _id: string;
        title: string;
        artist: string;
        duration: number;
        imageUrl?: string;
      };
    };
    playbackState?: {
      isPlaying: boolean;
      position: number;
      timestamp?: number | string | Date;
    };
    adminId?: string | { _id: string };
  };
}

const SyncMusicDialog = ({ open, onClose, hall }: SyncMusicDialogProps) => {
  console.log('[SyncMusicDialog] Full Hall Object:', JSON.stringify(hall, null, 2));
  console.log('[SyncMusicDialog] Rendered with hall:', { 
    id: hall?._id, 
    hasCurrentSong: !!hall?.currentSong, 
    songIdType: typeof hall?.currentSong?.songId,
    songIdValue: hall?.currentSong?.songId,
    isPlaying: hall?.playbackState?.isPlaying,
    fullCurrentSong: hall?.currentSong
  });
  const { isSyncEnabled, toggleSync } = useHallStore();
  const { songs: personalSong } = useMusicStore();
  const [isLoading, setIsLoading] = useState(false);
  // Calculate live position based on timestamp
  const calculateLivePosition = () => {
    if (hall.playbackState?.position === undefined) return 0;
    
    let pos = hall.playbackState.position;
    if (hall.playbackState.isPlaying && hall.playbackState.timestamp) {
      const elapsed = (Date.now() - new Date(hall.playbackState.timestamp).getTime()) / 1000;
      pos += elapsed;
    }
    
    const maxDuration = hall.currentSong?.songId?.duration || 300;
    return Math.min(pos, maxDuration);
  };

  const [currentPosition, setCurrentPosition] = useState(calculateLivePosition());

  // Update position in real-time when synced
  useEffect(() => {
    if (!hall.playbackState?.isPlaying || !hall.currentSong?.songId) return;

    const interval = setInterval(() => {
      setCurrentPosition(calculateLivePosition());
    }, 1000);

    return () => clearInterval(interval);
  }, [
    hall.playbackState?.isPlaying,
    hall.playbackState?.timestamp,
    hall.currentSong,
  ]);

  // Sync position when hall state changes
  useEffect(() => {
    setCurrentPosition(calculateLivePosition());
  }, [hall.playbackState?.position, hall.playbackState?.timestamp, hall.playbackState?.isPlaying]);

  const handleToggleSync = async () => {
    setIsLoading(true);
    try {
      // If Admin is disabling sync and music is playing, pause it first
      if (isSyncEnabled && hall.playbackState?.isPlaying) {
         // Check if current user is admin
         const { currentUserId } = useHallStore.getState();
         const isAdmin = typeof hall.adminId === 'string' 
            ? hall.adminId === currentUserId
            : hall.adminId?._id === currentUserId;
            


// ... inside component ...
         if (isAdmin) {
            console.log('[SyncMusicDialog] Admin stopping sync - pausing HALL playback');
            // Pause the HALL playback so everyone stops
            await hallMusicApi.togglePlayback(hall._id);
            // Also pause local player just in case
            const playerStore = usePlayerStore.getState();
            if (playerStore.isPlaying) {
              playerStore.togglePlay();
            } 
         }
      }

      // Unlock audio context on user interaction
      await audioContextManager.unlockAudio();
      await toggleSync(hall._id);
    } catch (error) {
      console.error("Error toggling sync:", error);
    }
    setIsLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to get song object regardless of structure
  const getSong = () => {
    if (!hall.currentSong) {
      console.log('[SyncMusicDialog] No currentSong in hall');
      return null;
    }
    
    // Case 1: Standard populated structure { songId: { ...song... } }
    if (hall.currentSong.songId && typeof hall.currentSong.songId === 'object' && 'title' in hall.currentSong.songId) {
      console.log('[SyncMusicDialog] Found song in songId object');
      return hall.currentSong.songId;
    }
    
    // Case 2: Flat structure { ...song... } (fallback or socket update)
    if ('title' in hall.currentSong) {
      console.log('[SyncMusicDialog] Found song in currentSong root');
      return hall.currentSong as any;
    }

    // Case 3: Unpopulated ID string (we can't display details but we know something is playing)
    if (typeof hall.currentSong.songId === 'string') {
      console.log('[SyncMusicDialog] Found songId string only (unpopulated):', hall.currentSong.songId);
      // We might want to fetch the song details here if we have the ID, but for now just return null or a placeholder?
      // Returning null will show "No music playing" which is confusing if ID exists.
      // Let's return a placeholder if we have an ID but no details.
      return null; 
    }

    console.log('[SyncMusicDialog] Could not extract song from:', JSON.stringify(hall.currentSong, null, 2));
    return null;
  };

  const song = getSong();



  if (!song) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-white">Hall Music</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Current playback status
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <Music size={48} className="mb-4 text-zinc-600" />
            <p className="text-lg font-medium">No music playing</p>
            <p className="text-sm mb-4">Wait for the admin to start a song</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => useHallStore.getState().fetchHall(hall._id)}
              className="border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              Refresh Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isSyncEnabled ? (
              <Volume2 className="text-green-500" size={20} />
            ) : (
              <Music className="text-zinc-400" size={20} />
            )}
            Now Playing
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            View current song details and sync settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Album Art */}
          <div className="relative group">
            <img
              src={song.imageUrl || "/albums/album1.jpg"}
              alt="Album Art"
              className={`w-48 h-48 rounded-xl object-cover shadow-2xl transition-all duration-500 ${
                hall.playbackState?.isPlaying ? "scale-100" : "scale-95 opacity-80"
              }`}
            />
            {hall.playbackState?.isPlaying && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg animate-bounce">
                <Volume2 size={16} className="text-white" />
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-white truncate max-w-[300px]">
              {song.title}
            </h3>
            <p className="text-zinc-400 font-medium">
              {song.artist}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-2">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isSyncEnabled ? "bg-green-500" : "bg-zinc-500"
                }`}
                style={{ width: `${(currentPosition / (song.duration || 300)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500 font-medium">
              <span>{formatTime(currentPosition)}</span>
              <span>{formatTime(song.duration || 0)}</span>
            </div>
          </div>

          {/* Sync Button */}
          <div className="w-full pt-2">
            <Button
              onClick={handleToggleSync}
              disabled={isLoading}
              className={`w-full font-bold py-6 text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                isSyncEnabled
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-2 border-red-500/50"
                  : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : isSyncEnabled ? (
                <div className="flex items-center gap-2">
                  <VolumeX size={24} />
                  Stop Syncing
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Volume2 size={24} />
                  Sync with Hall
                </div>
              )}
            </Button>
            
            {!isSyncEnabled && personalSong && personalSong.length > 0 && (
              <p className="text-xs text-yellow-500/80 mt-3 text-center font-medium">
                ⚠️ Your personal music will pause when you sync
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncMusicDialog;
