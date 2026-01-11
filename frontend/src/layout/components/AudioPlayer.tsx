import { usePlayerStore } from "@/stores/usePlayerStore";
import { useEffect, useRef } from "react";
import { useHallStore } from "@/stores/useHallStore";
import { audioContextManager } from "@/lib/audioContext";

import { useUser } from "@clerk/clerk-react";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);
  const { user } = useUser();

  const { currentSong, isPlaying, playNext, setAudioRef } = usePlayerStore();
  const { isSyncEnabled, currentHall, emitHallPlayback } = useHallStore();

  const isAdmin = currentHall?.adminId && user?.id && (
    typeof currentHall.adminId === 'string' 
      ? currentHall.adminId === user.id 
      : currentHall.adminId._id === user.id
  );

  // Register audio ref with store
  useEffect(() => {
    setAudioRef(audioRef.current);
    return () => setAudioRef(null);
  }, [setAudioRef]);

  // handle play/pause logic for personal music OR admin in sync mode
  useEffect(() => {
    const audio = audioRef.current;
    // If synced and NOT admin, we don't control playback locally via player store
    if (!audio || (isSyncEnabled && !isAdmin)) return;

    if (isPlaying) {
      // Ensure audio context is unlocked
      audioContextManager.unlockAudio().then(() => {
        audio.play().catch((error) => {
          console.error("Audio play failed:", error);
          if (error.name === "NotAllowedError") {
            console.log("Autoplay blocked - user interaction required");
          }
        });
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, isSyncEnabled, isAdmin]);

  // handle song ends for personal music OR admin in sync mode
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      // If synced and NOT admin, we don't auto-play next (admin does)
      if (!isSyncEnabled || isAdmin) {
        playNext();
      }
    };

    audio?.addEventListener("ended", handleEnded);

    return () => audio?.removeEventListener("ended", handleEnded);
  }, [playNext, isSyncEnabled, isAdmin]);

  // handle song changes for personal music OR admin in sync mode
  useEffect(() => {
    // If synced and NOT admin, we don't change songs locally via player store
    if (!audioRef.current || !currentSong || (isSyncEnabled && !isAdmin)) return;

    const audio = audioRef.current;

      // Check if this is actually a new song
    const isSongChange = prevSongRef.current !== currentSong?.audioUrl;
    if (isSongChange) {
      // If audioUrl is missing (e.g. during optimistic update), don't try to load/play yet
      if (!currentSong?.audioUrl) {
        console.log("AudioPlayer: Skipping load due to missing audioUrl");
        return;
      }

      audio.src = currentSong.audioUrl;
      // reset the playback position
      audio.currentTime = 0;

      prevSongRef.current = currentSong.audioUrl;

      // Load the audio and ensure it's unmuted
      audio.load();
      audio.muted = false;
      audio.volume = 0.8;

      if (isPlaying) {
        audioContextManager.unlockAudio().then(() => {
          audio.play().catch((error) => {
            console.error("Audio play failed on song change:", error);
          });
        });
      }
    }
  }, [currentSong, isPlaying, isSyncEnabled, isAdmin]);

    // Track previous sync state to detect toggles
    const prevSyncEnabledRef = useRef(isSyncEnabled);

    // Handle hall sync audio playback (RECEIVER logic)
    useEffect(() => {
      const audio = audioRef.current;
      // If NOT synced, we don't listen to hall state
      if (!audio || !isSyncEnabled) return;

      // NOTE: Even if we are Admin, we should listen to hall state updates 
      // because actions from the UI (like QueueDialog) update the server first.
      // The server then broadcasts the new state, and we need to reflect that locally.
      // We rely on the fact that our local 'emit' logic won't create a loop 
      // because we only emit on actual audio events, and setting state here won't re-trigger if values are same.

      const hallSong = currentHall?.currentSong?.songId;
      const playbackState = currentHall?.playbackState;

      // If audioUrl is missing (e.g. optimistic update), wait for real update
      if (!hallSong?.audioUrl) {
        // console.warn("Hall sync: No song or audio URL available");
        return;
      }

      // Check if this is a new hall song OR if we just enabled sync (force refresh)
      const isSongChange = prevSongRef.current !== hallSong.audioUrl;
      const justEnabledSync = !prevSyncEnabledRef.current && isSyncEnabled;
      
      if (isSongChange || justEnabledSync) {
        console.log("Hall sync: Loading song (Change/Toggle):", hallSong.title);
        audio.src = hallSong.audioUrl;
        prevSongRef.current = hallSong.audioUrl;

        // Load the audio and ensure it's unmuted for hall sync
        audio.load();
        audio.muted = false;
        audio.volume = 0.8;

        // Set initial position for new song with live timestamp calculation
        if (playbackState?.position !== undefined) {
          let startPosition = playbackState.position;
          // Calculate live position if playing
          if (playbackState.isPlaying && playbackState.timestamp) {
             const elapsed = (Date.now() - new Date(playbackState.timestamp).getTime()) / 1000;
             startPosition = Math.min(startPosition + elapsed, hallSong.duration || 300);
          }
          audio.currentTime = startPosition;
        }
        
        // Auto-play if state says playing
        if (playbackState?.isPlaying) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error("Hall sync: Auto-play failed:", error);
              // Try to unlock audio context if blocked
              if (error.name === "NotAllowedError") {
                 audioContextManager.unlockAudio().then(() => {
                   audio.play().catch(e => console.error("Hall sync: Retry play failed:", e));
                 });
              }
            });
          }
        }
      }

      // Handle position updates (for seeking and sync corrections)
      if (playbackState?.position !== undefined && !isSongChange && !justEnabledSync) {
        const currentTime = audio.currentTime;
        let targetTime = playbackState.position;
        
        // Calculate live target time
        if (playbackState.isPlaying && playbackState.timestamp) {
           const elapsed = (Date.now() - new Date(playbackState.timestamp).getTime()) / 1000;
           targetTime = Math.min(targetTime + elapsed, hallSong.duration || 300);
        }

        // Tighter sync threshold (0.5s) for better accuracy
        // Also account for latency (approx 100-200ms)
        const diff = Math.abs(currentTime - targetTime);
        
        if (diff > 0.5) {
          console.log(`Hall sync: Seeking from ${currentTime} to ${targetTime} (diff: ${diff})`);
          audio.currentTime = targetTime;
        }
      }

      // Handle play/pause for hall sync
      if (playbackState?.isPlaying) {
        if (audio.paused) {
          console.log("Hall sync: Starting playback");
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.error("Hall sync audio play failed:", error);
            });
          }
        }
      } else {
        if (!audio.paused) {
          console.log("Hall sync: Pausing playback");
          audio.pause();
        }
      }
    }, [isSyncEnabled, isAdmin, currentHall?.currentSong?.songId?._id, currentHall?.playbackState?.isPlaying, currentHall?.playbackState?.position]);

    // Update prevSyncEnabledRef after effects run
    useEffect(() => {
      prevSyncEnabledRef.current = isSyncEnabled;
    }, [isSyncEnabled]);

  // Emit sync events (SENDER logic)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isSyncEnabled || !isAdmin) return;

    const handlePlay = () => {
      // Only emit if we are truly playing and it wasn't a remote update
      if (currentHall?.playbackState?.isPlaying === false) {
         emitHallPlayback({ isPlaying: true, position: audio.currentTime });
      }
    };

    const handlePause = () => {
      // Only emit if we are truly paused and it wasn't a remote update
      if (currentHall?.playbackState?.isPlaying === true) {
         emitHallPlayback({ isPlaying: false, position: audio.currentTime });
      }
    };

    const handleSeeked = () => {
      // Only emit if the seek position is significantly different from server
      // This prevents echo-seeking
      const serverPos = currentHall?.playbackState?.position || 0;
      if (Math.abs(audio.currentTime - serverPos) > 1.0) {
         emitHallPlayback({ isPlaying: !audio.paused, position: audio.currentTime });
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeeked);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeked', handleSeeked);
    };
  }, [isSyncEnabled, isAdmin, emitHallPlayback]);

  return <audio ref={audioRef} preload="auto" />;
};
export default AudioPlayer;
