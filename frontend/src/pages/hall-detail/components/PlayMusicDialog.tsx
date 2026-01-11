import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Plus, Search } from "lucide-react";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { hallMusicApi } from "@/lib/api";
import { audioContextManager } from "@/lib/audioContext";
import toast from "react-hot-toast";
import { useHallStore } from "@/stores/useHallStore";

interface PlayMusicDialogProps {
  open: boolean;
  onClose: () => void;
  hallId: string;
}

const PlayMusicDialog = ({ open, onClose, hallId }: PlayMusicDialogProps) => {
  const { songs, fetchSongs, fetchAlbums } = useMusicStore();
  const { setCurrentSong } = usePlayerStore();
  const { isSyncEnabled, toggleSync } = useHallStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSongs, setFilteredSongs] = useState(songs);

  useEffect(() => {
    if (open) {
      fetchSongs();
      fetchAlbums();
    }
  }, [open, fetchSongs, fetchAlbums]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredSongs(
        songs.filter(
          (song) =>
            song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (song.albumId as any)?.title
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredSongs(songs);
    }
  }, [searchQuery, songs]);



  const handlePlayNow = async (song: any) => {
    try {
      // Unlock audio on user interaction
      await audioContextManager.unlockAudio();
      
      // Ensure sync is enabled for Admin so events are emitted
      if (!isSyncEnabled) {
        await toggleSync(hallId);
      }
      
      // Update local player store immediately for instant feedback
      setCurrentSong(song);
      
      // Use HTTP API to trigger play on server (reliable DB update + socket broadcast)
      console.log('[PlayMusicDialog] Triggering play via API for hall:', hallId);
      await hallMusicApi.playSong(hallId, { songId: song._id });
      
      toast.success("Song is now playing!");
      onClose();
    } catch (error) {
      console.error("Error playing song:", error);
      toast.error("Failed to play song");
    }
  };

  const handleAddToQueue = async (songId: string) => {
    try {
      await hallMusicApi.addToQueue(hallId, { songId });
      toast.success("Song added to queue!");
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast.error("Failed to add song to queue");
    }
  };

  const SongCard = ({ song }: { song: any }) => (
    <div className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg group transition-colors">
      <img
        src={song.imageUrl}
        alt={song.title}
        className="w-10 h-10 rounded object-cover"
      />

      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate text-sm">
          {song.title}
        </h3>
        <p className="text-zinc-400 text-xs truncate">{song.artist}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          onClick={() => handlePlayNow(song)}
          className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 h-7 text-xs"
        >
          <Play size={12} className="mr-1" />
          Play
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddToQueue(song._id)}
          className="border-zinc-600 text-white hover:bg-zinc-700 px-2 py-1 h-7 text-xs"
        >
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-white text-lg">🎵 Add Music</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
            />
            <Input
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400 h-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 min-h-0">
            {searchQuery.trim() ? (
              /* Search Results */
              <div className="space-y-2">
                <h3 className="text-white font-medium text-sm mb-2 sticky top-0 bg-zinc-900 py-1">
                  🔍 Results ({filteredSongs.length})
                </h3>
                {filteredSongs.length > 0 ? (
                  <div className="space-y-1">
                    {filteredSongs.slice(0, 20).map((song) => (
                      <SongCard key={song._id} song={song} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    <Search size={32} className="mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm">No songs found</p>
                  </div>
                )}
              </div>
            ) : (
              /* Browse Content */
              <div className="space-y-4">
                {/* All Songs */}
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">
                    🎵 All Songs
                  </h3>
                  <div className="space-y-1">
                    {songs.slice(0, 15).map((song) => (
                      <SongCard key={song._id} song={song} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayMusicDialog;
