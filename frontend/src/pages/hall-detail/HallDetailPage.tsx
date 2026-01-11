import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useHallStore } from "@/stores/useHallStore";
import { useHallChatStore } from "@/stores/useHallChatStore";
import { socketManager } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  Settings,
  Music,
  List,
  DoorOpen,
  Send,
  Smile,
  Crown,
  Plus,
} from "lucide-react";
import MembersDialog from "./components/MembersDialog";
import SettingsDialog from "./components/SettingsDialog";
import PlayMusicDialog from "./components/PlayMusicDialog";
import QueueDialog from "./components/QueueDialog";
import SyncMusicDialog from "./components/SyncMusicDialog";
import ChatMessage from "./components/ChatMessage";
import toast from "react-hot-toast";
import EmojiPicker, { Theme } from "emoji-picker-react";

const HallDetailPage = () => {
  const { hallId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentHall,
    fetchHall,
    leaveHall,
    deleteHall,
    isLoading,
    isSyncEnabled,
  } = useHallStore();
  const { messages, sendMessage, fetchMessages, isTyping, clearMessages } =
    useHallChatStore();

  // Get current user ID from Clerk
  const { user } = useUser();
  const currentUserId = user?.id || "";

  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPlayMusicDialog, setShowPlayMusicDialog] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { updateCurrentHall, setCurrentUserId } = useHallStore();

  useEffect(() => {
    if (currentUserId) {
      setCurrentUserId(currentUserId);
    }
  }, [currentUserId, setCurrentUserId]);

  const handlePlaybackSync = useCallback(
    (data: any) => {
      try {
        console.log("Received playback sync:", data.action, data);

        // Update hall state with new playback data
        updateCurrentHall({
          currentSong: data.song
            ? {
                songId: data.song,
                startedAt: new Date(),
                position: data.position || 0,
              }
            : undefined,
          playbackState: {
            isPlaying: data.playbackState?.isPlaying || false,
            position: data.position || 0,
            timestamp: data.timestamp || Date.now(),
          },
        });

        // If user is synced, the AudioPlayer will handle the actual playback
        if (isSyncEnabled) {
          console.log("Hall playback sync:", data.action, data.song?.title);
        }
      } catch (error) {
        console.error("Error handling playback sync:", error);
      }
    },
    [isSyncEnabled, updateCurrentHall]
  );

  // Effect to manage socket connection and hall joining
  useEffect(() => {
    if (currentUserId && hallId) {
      const socket = socketManager.connect(currentUserId);
      
      const handleConnect = () => {
        console.log('Socket connected, joining hall:', hallId);
        socketManager.joinHall(hallId);
      };

      if (socket?.connected) {
        handleConnect(); // If already connected, join immediately
      } else {
        socket?.on('connect', handleConnect); // Otherwise, listen for connect
      }

      // Cleanup for this specific effect
      return () => {
        socket?.off('connect', handleConnect);
        // Note: socketManager.leaveHall is handled in the main useEffect cleanup
      };
    }
  }, [currentUserId, hallId]);

  useEffect(() => {
    if (hallId && currentUserId) {
      fetchHall(hallId);
      // Add error handling for message fetching
      fetchMessages(hallId).catch((error) => {
        console.error("Failed to fetch messages:", error);
      });

      // Subscribe to store sync events (handles song changes and playback sync)
      useHallStore.getState().subscribeToSyncEvents();

      // Listen for real-time messages
      socketManager.onHallMessage((message) => {
        console.log("Received hall message:", message);
        // Messages are handled by the chat store via socket event in useChatStore?
        // Wait, useHallChatStore doesn't have socket listeners.
        // We need to handle message updates here or in the store.
        // The previous code logged it but didn't update store?
        // Let's check useHallChatStore.addMessage
        useHallChatStore.getState().addMessage(message);
      });

      // Listen for queue updates
      socketManager.onQueueUpdate((data) => {
        console.log("Queue update received:", data);
        // Refresh hall data to get updated queue
        fetchHall(hallId);
      });

      // Listen for hall online status updates
      socketManager.getSocket()?.on("hall_online_update", (data: any) => {
        console.log("Hall online update:", data);
        if (useHallStore.getState().currentHall) {
          // Update online count without full refresh
          const { updateCurrentHall } = useHallStore.getState();
          updateCurrentHall({ onlineCount: data.onlineCount });
        }
      });

      // Listen for message deletion
      socketManager.getSocket()?.on("hall_message_deleted", (data: any) => {
        console.log("Message deleted:", data);
        if (data.hallId === hallId) {
          useHallChatStore.getState().removeMessage(data.messageId);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (hallId) {
        socketManager.leaveHall(hallId);
      }
      clearMessages();
      useHallStore.getState().unsubscribeFromSyncEvents();

      // Remove event listeners
      const socket = socketManager.getSocket();
      if (socket) {
        socket.off("hall_message_received");
        socket.off("hall:queue-update");
        socket.off("hall_online_update");
        socket.off("hall_message_deleted");
      }
    };
  }, [
    hallId,
    currentUserId,
    fetchHall,
    fetchMessages,
    clearMessages,
    handlePlaybackSync,
  ]);

  useEffect(() => {
    const handleOpenPlayMusic = () => setShowPlayMusicDialog(true);
    window.addEventListener('open-play-music-dialog', handleOpenPlayMusic);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener('open-play-music-dialog', handleOpenPlayMusic);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !hallId) return;

    try {
      await sendMessage(hallId, message, replyTo?._id);
      setMessage("");
      setReplyTo(null);
    } catch {
      console.error("Error sending message");
      toast.error("Failed to send message");
    }
  };

  const handleLeaveHall = async () => {
    if (!hallId) return;
    if (window.confirm("Are you sure you want to leave this hall?")) {
      try {
        await leaveHall(hallId);
        toast.success("Left hall successfully");
        navigate("/halls");
      } catch {
        toast.error("Failed to leave hall");
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!hallId) return;
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await useHallChatStore.getState().deleteMessage(hallId, messageId);
      } catch {
        // Error handled in store
      }
    }
  };

  const handleDeleteHall = async () => {
    if (!hallId) return;
    if (
      window.confirm(
        "Are you sure you want to delete this hall? This action cannot be undone and will remove all messages and members."
      )
    ) {
      try {
        await deleteHall(hallId);
        toast.success("Hall deleted successfully");
        navigate("/halls");
      } catch {
        toast.error("Failed to delete hall");
      }
    }
  };

  const isAdmin =
    typeof currentHall?.adminId === "string"
      ? currentHall.adminId === currentUserId
      : currentHall?.adminId?._id === currentUserId;

  if (isLoading || !currentHall) {
    return (
      <div className="h-full bg-zinc-900 flex items-center justify-center">
        <div className="text-white">Loading hall...</div>
      </div>
    );
  }

  return (
    <div className="h-full glass flex flex-col relative rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-white/10 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Hall info */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/halls")}
              className="text-white hover:bg-white/10 p-2 rounded-lg"
            >
              <ArrowLeft size={20} />
            </Button>

            <img
              src={currentHall.coverImage || "/albums/album1.jpg"}
              alt={currentHall.name}
              className="w-10 h-10 rounded-xl object-cover border-2 border-white/10"
              onError={(e) => {
                console.log("Cover image failed to load, using fallback");
                e.currentTarget.src = "/albums/album1.jpg";
              }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-base truncate">
                  {currentHall.name}
                </h1>
                <span
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    currentHall.type === "public"
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {currentHall.type.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <div className="flex items-center gap-1">
                  <img
                    src={
                      typeof currentHall.adminId === "string"
                        ? "/default-avatar.png"
                        : (currentHall.adminId as any)?.imageUrl ||
                          (currentHall.adminId as any)?.avatar ||
                          "/default-avatar.png"
                    }
                    alt={
                      typeof currentHall.adminId === "string"
                        ? "Admin"
                        : (currentHall.adminId as any)?.fullName ||
                          (currentHall.adminId as any)?.name ||
                          "Admin"
                    }
                    className="w-3 h-3 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
                  <span>
                    {typeof currentHall.adminId === "string"
                      ? "Admin"
                      : (currentHall.adminId as any)?.fullName ||
                        (currentHall.adminId as any)?.name ||
                        "Admin"}
                  </span>
                  <Crown size={10} className="text-yellow-500" />
                </div>
                <span>•</span>
                <span>{currentHall.memberCount} members</span>
                <span>•</span>
                <span className="text-blue-400">
                  {(currentHall as any).onlineCount ?? 0} online
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMembersDialog(true)}
              className="text-white hover:bg-white/10 relative h-8 w-8 p-0"
              title="View members"
            >
              <Users size={18} />
              {(currentHall as any).onlineCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {(currentHall as any).onlineCount}
                </span>
              )}
            </Button>

            {/* Music/Sync Button - Visible to everyone */}
            {currentHall.currentSong && !isSyncEnabled ? (
              <Button
                onClick={() => setShowSyncDialog(true)}
                className="bg-green-600 hover:bg-green-500 text-white font-medium px-3 py-1.5 h-8 rounded-lg shadow-lg shadow-green-900/20 animate-in fade-in zoom-in duration-300"
              >
                <Music size={16} className="mr-2" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Join Audio</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSyncDialog(true)}
                className={`relative h-8 w-8 p-0 ${
                  isSyncEnabled
                    ? "text-green-400 hover:text-green-300"
                    : "text-white hover:bg-white/10"
                }`}
                title="Music & Sync"
              >
                <Music size={18} />
                {(currentHall.playbackState?.isPlaying || currentHall.currentSong) && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-2 h-2 animate-pulse" />
                )}
              </Button>
            )}

            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettingsDialog(true)}
                  className="text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  <Settings size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlayMusicDialog(true)}
                  className="text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  <Plus size={18} />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQueueDialog(true)}
              className="text-white hover:bg-white/10 relative h-8 w-8 p-0"
              title="View queue"
            >
              <List size={18} />
              {currentHall.queueLength > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {currentHall.queueLength}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={isAdmin ? handleDeleteHall : handleLeaveHall}
              className="text-red-400 hover:bg-red-500/20 hover:text-red-300 h-8 w-8 p-0"
              title={isAdmin ? "Delete hall" : "Leave hall"}
            >
              <DoorOpen size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.map((msg) => (
          <ChatMessage
            key={msg._id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            isAdmin={isAdmin}
            onReply={setReplyTo}
            onDelete={handleDeleteMessage}
          />
        ))}

        {isTyping && (
          <div className="text-zinc-400 text-sm italic">
            Someone is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div className="glass border-t border-white/10 px-4 py-2 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-green-400 text-sm">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-zinc-300 text-sm truncate">{replyTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="text-zinc-400 hover:text-white"
          >
            ×
          </Button>
        </div>
      )}

      {/* Message Input */}
      <div className="glass border-t border-white/10 p-2">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-zinc-400 hover:text-white"
            >
              <Smile size={20} />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50" ref={emojiPickerRef}>
                <EmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={(emojiData) => {
                    setMessage((prev) => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
          </div>

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
          />

          <Button
            type="submit"
            disabled={!message.trim()}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50"
          >
            <Send size={20} />
          </Button>
        </form>
      </div>

      {/* Dialogs */}
      <MembersDialog
        open={showMembersDialog}
        onClose={() => setShowMembersDialog(false)}
        hall={currentHall as any}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <>
          <SettingsDialog
            open={showSettingsDialog}
            onClose={() => setShowSettingsDialog(false)}
            hall={currentHall}
          />

          <PlayMusicDialog
            open={showPlayMusicDialog}
            onClose={() => setShowPlayMusicDialog(false)}
            hallId={hallId!}
          />
        </>
      )}

      <QueueDialog
        open={showQueueDialog}
        onClose={() => setShowQueueDialog(false)}
        hall={currentHall as any}
        isAdmin={isAdmin}
      />

      <SyncMusicDialog
        open={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        hall={currentHall as any}
      />
    </div>
  );
};

export default HallDetailPage;
