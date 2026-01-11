import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import {
  Laptop2,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const PlaybackControls = () => {
  const { isPlaying, togglePlay, playNext, playPrevious } = usePlayerStore();

  const [volume, setVolume] = useState(75);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { currentSong } = usePlayerStore();

  useEffect(() => {
    const getAudioElement = () => {
      // Try multiple ways to get the audio element
      return (
        audioRef.current ||
        (document.querySelector("audio") as HTMLAudioElement)
      );
    };

    const audio = getAudioElement();
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);

    const handleEnded = () => {
      usePlayerStore.setState({ isPlaying: false });
    };

    audio.addEventListener("ended", handleEnded);

    // Update immediately if audio is already loaded
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current || (document.querySelector("audio") as HTMLAudioElement);
    if (audio && !isNaN(value[0])) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  return (
    <footer className="h-14 sm:h-16 glass rounded-full px-4 flex items-center justify-between backdrop-blur-2xl">
      <div className="flex items-center gap-3 min-w-[140px] w-[25%]">
        {currentSong && (
          <>
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="w-10 h-10 object-cover rounded-full border border-white/10 shadow-lg animate-spin-slow"
            />
            <div className="flex-1 min-w-0 hidden sm:block">
              <div className="font-medium truncate hover:underline cursor-pointer text-white text-sm">
                {currentSong.title}
              </div>
              <div className="text-xs text-zinc-400 truncate hover:underline cursor-pointer">
                {currentSong.artist}
              </div>
            </div>
          </>
        )}
      </div>

        {/* player controls*/}
        <div className="flex flex-col items-center justify-center gap-1 flex-1 max-w-full sm:max-w-[50%] h-full">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:inline-flex hover:text-cyan-400 text-zinc-400 h-8 w-8"
            >
              <Shuffle className="h-3 w-3" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="hover:text-cyan-400 text-zinc-400 h-8 w-8"
              onClick={playPrevious}
              disabled={!currentSong}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="bg-cyan-500 hover:bg-cyan-400 text-white rounded-full h-8 w-8 shadow-lg glossy-button"
              onClick={togglePlay}
              disabled={!currentSong}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-white text-white" />
              ) : (
                <Play className="h-4 w-4 fill-white text-white" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hover:text-cyan-400 text-zinc-400 h-8 w-8"
              onClick={playNext}
              disabled={!currentSong}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:inline-flex hover:text-cyan-400 text-zinc-400 h-8 w-8"
            >
              <Repeat className="h-3 w-3" />
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-2 w-full px-2">
            <div className="text-[10px] text-zinc-500 w-8 text-right">
              {formatTime(currentTime)}
            </div>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              className="w-full hover:cursor-grab active:cursor-grabbing h-1.5"
              onValueChange={handleSeek}
              disabled={!currentSong || !duration}
            />
            <div className="text-[10px] text-zinc-500 w-8">{formatTime(duration)}</div>
          </div>
        </div>
        {/* volume controls */}
        <div className="hidden sm:flex items-center gap-2 min-w-[140px] w-[25%] justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-cyan-400 text-zinc-400 h-8 w-8"
          >
            <Mic2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-cyan-400 text-zinc-400 h-8 w-8"
          >
            <ListMusic className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:text-cyan-400 text-zinc-400 h-8 w-8"
          >
            <Laptop2 className="h-3 w-3" />
          </Button>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="hover:text-cyan-400 text-zinc-400 h-8 w-8"
            >
              <Volume1 className="h-3 w-3" />
            </Button>

            <Slider
              value={[volume]}
              max={100}
              step={1}
              className="w-16 hover:cursor-grab active:cursor-grabbing h-1.5"
              onValueChange={(value) => {
                setVolume(value[0]);
                if (audioRef.current) {
                  audioRef.current.volume = value[0] / 100;
                }
              }}
            />
          </div>
        </div>

    </footer>
  );
};
