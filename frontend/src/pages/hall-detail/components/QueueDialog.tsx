import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  X,
  Plus,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { useHallStore } from "@/stores/useHallStore";


interface QueueDialogProps {
  open: boolean;
  onClose: () => void;
  hall: {
    _id: string;
    currentSong?: {
      songId?: {
        _id: string;
        title: string;
        artist: string;
        imageUrl: string;
        duration: number;
      };
    };
    playbackState?: {
      isPlaying: boolean;
      position: number;
      timestamp?: number | string | Date;
    };
    queue: Array<{
      songId: {
        _id: string;
        title: string;
        artist: string;
        imageUrl: string;
        duration: number;
      };
    }>;
  };
  isAdmin: boolean;
}

const QueueDialog = ({ open, onClose, hall, isAdmin }: QueueDialogProps) => {
  const { togglePlayback, skipToNext, removeFromQueue, seek } = useHallStore();

  // Calculate live position based on timestamp
  const calculateLivePosition = () => {
    if (hall.playbackState?.position === undefined) return 0;
    
    let pos = hall.playbackState.position;
    if (hall.playbackState.isPlaying && hall.playbackState.timestamp) {
      // Handle timestamp being a string or number
      const timestamp = new Date(hall.playbackState.timestamp).getTime();
      const elapsed = (Date.now() - timestamp) / 1000;
      pos += elapsed;
    }
    
    const maxDuration = hall.currentSong?.songId?.duration || 300;
    return Math.min(pos, maxDuration);
  };

  const [currentPosition, setCurrentPosition] = useState(calculateLivePosition());

  // Update position in real-time when playing
  useEffect(() => {
    if (!hall.playbackState?.isPlaying || !hall.currentSong?.songId) return;

    const interval = setInterval(() => {
      // Recalculate from timestamp every tick to avoid drift
      setCurrentPosition(calculateLivePosition());
    }, 1000);

    return () => clearInterval(interval);
  }, [
    hall.playbackState?.isPlaying,
    hall.playbackState?.timestamp, // Add timestamp dependency
    hall.currentSong?.songId,
  ]);

  // Sync position when hall state changes
  useEffect(() => {
    setCurrentPosition(calculateLivePosition());
  }, [hall.playbackState?.position, hall.playbackState?.timestamp, hall.playbackState?.isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = async () => {
    try {
      console.log("Toggling playback for hall:", hall._id);
      await togglePlayback(hall._id);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleNext = async () => {
    try {
      console.log("Skipping to next song");
      await skipToNext(hall._id);
    } catch (error) {
      // Error handled in store
    }
  };

  const handlePrevious = async () => {
    console.log("Previous song - not implemented");
  };

  const handleSeek = async (position: number) => {
    try {
      console.log("Seeking to position:", position);
      await seek(hall._id, position);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleRemoveFromQueue = async (queueIndex: number) => {
    try {
      console.log("Removing song from queue at index:", queueIndex);
      await removeFromQueue(hall._id, queueIndex);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleAddSongs = () => {
    // This will be handled by the parent component via a callback or state
    // For now, we'll emit a custom event that the parent can listen to
    const event = new CustomEvent('open-play-music-dialog');
    window.dispatchEvent(event);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-white text-xl">
            🎵 Music Queue ({hall.queue.length} songs)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-6 min-h-0">
          {/* Now Playing */}
          {hall.currentSong?.songId && (
            <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-xl p-6 border border-zinc-600">
              <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                🎵 NOW PLAYING
              </h3>

              <div className="flex items-center gap-4 mb-6">
                <img
                  src={hall.currentSong.songId.imageUrl}
                  alt={hall.currentSong.songId.title}
                  className="w-16 h-16 rounded-lg object-cover shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-lg truncate">
                    {hall.currentSong.songId.title}
                  </h4>
                  <p className="text-zinc-300 truncate">
                    {hall.currentSong.songId.artist}
                  </p>
                </div>
              </div>

              {/* Admin Controls */}
              {isAdmin && (
                <div className="space-y-3">
                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-6">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handlePrevious}
                      className="text-white hover:bg-zinc-600 rounded-full p-3"
                      disabled
                    >
                      <SkipBack size={24} />
                    </Button>

                    <Button
                      onClick={handlePlayPause}
                      className="bg-green-600 hover:bg-green-500 text-white rounded-full w-14 h-14 p-0 shadow-lg hover:scale-105 transition-transform"
                    >
                      {hall.playbackState?.isPlaying ? (
                        <Pause size={24} />
                      ) : (
                        <Play size={24} className="ml-1" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleNext}
                      className="text-white hover:bg-zinc-600 rounded-full p-3"
                      disabled={hall.queue.length === 0}
                    >
                      <SkipForward size={24} />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Slider
                      value={[currentPosition]}
                      max={hall.currentSong?.songId?.duration || 0}
                      step={1}
                      onValueChange={([value]) => handleSeek(value)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>{formatTime(currentPosition)}</span>
                      <span>
                        {formatTime(hall.currentSong?.songId?.duration || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-zinc-400" />
                    <Slider
                      defaultValue={[70]}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {/* Member View */}
              {!isAdmin && hall.playbackState && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-400 mb-2">
                    {hall.playbackState.isPlaying ? (
                      <Play size={16} className="text-green-400" />
                    ) : (
                      <Pause size={16} />
                    )}
                    <span className="text-sm">
                      {formatTime(currentPosition)} /{" "}
                      {formatTime(hall.currentSong?.songId?.duration || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-1">
                    <div
                      className="bg-green-500 h-1 rounded-full transition-all"
                      style={{
                        width: `${
                          (currentPosition /
                            (hall.currentSong?.songId?.duration || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Queue */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                🎶 UP NEXT
              </h3>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleAddSongs}
                  className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg transition-all hover:scale-105"
                >
                  <Plus size={16} className="mr-2" />
                  Add Songs
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
              {hall.queue.length > 0 ? (
                <div className="space-y-2">
                  {hall.queue.map((queueItem, index) => (
                    <div
                      key={`${queueItem.songId._id}-${index}`}
                      className="flex items-center gap-4 p-3 hover:bg-zinc-800 rounded-lg group transition-colors"
                    >
                      <span className="text-zinc-400 font-medium text-sm w-8 text-center">
                        {index + 1}
                      </span>

                      <img
                        src={queueItem.songId.imageUrl}
                        alt={queueItem.songId.title}
                        className="w-12 h-12 rounded-lg object-cover shadow-md"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">
                          {queueItem.songId.title}
                        </h4>
                        <p className="text-zinc-400 text-sm truncate">
                          {queueItem.songId.artist} •{" "}
                          {formatTime(queueItem.songId.duration)}
                        </p>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromQueue(index)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition-all"
                          title="Remove from queue"
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play size={32} className="text-zinc-600" />
                  </div>
                  <p className="text-lg font-medium mb-2">Queue is empty</p>
                  <p className="text-sm mb-4">
                    Add some songs to get the party started!
                  </p>
                  {isAdmin && (
                    <Button
                      onClick={handleAddSongs}
                      className="bg-green-600 hover:bg-green-500 text-white font-medium px-6 py-2 rounded-lg transition-all hover:scale-105"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Songs
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QueueDialog;
