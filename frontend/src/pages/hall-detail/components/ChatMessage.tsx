import { Button } from "@/components/ui/button";
import { Reply, Trash2 } from "lucide-react";
import { CheckCheck } from "lucide-react";
interface ChatMessageProps {
  message: {
    _id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    timestamp: string;
    messageType?: "text" | "system";
    replyTo?: {
      content: string;
      senderName: string;
    };
  };
  isOwn: boolean;
  isAdmin?: boolean;
  onReply: (message: any) => void;
  onDelete?: (messageId: string) => void;
}

const ChatMessage = ({ message, isOwn, isAdmin, onReply, onDelete }: ChatMessageProps) => {

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // System messages (like join/leave, music changes)
  if (message.messageType === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-white/20 backdrop-blur-md text-zinc-800 px-3 py-1 rounded-full text-sm border border-white/30 shadow-sm">
          <span>{message.content}</span>
          <span className="ml-2 text-xs text-zinc-600">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 group mb-4 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Sender info (only for others) */}
      {!isOwn && (
        <img
          src={message.senderAvatar || "/default-avatar.png"}
          alt={message.senderName}
          className="w-8 h-8 rounded-full border border-white/30 object-cover shadow-sm mb-1"
        />
      )}

      <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <span className="text-xs text-zinc-600 ml-1 mb-1">
            {message.senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-2xl px-4 py-3 shadow-sm ${
            isOwn
              ? "bg-zinc-800 text-white rounded-br-sm"
              : "bg-black/60 backdrop-blur-md text-white rounded-bl-sm border border-white/10"
          }`}
        >
          {/* Reply context */}
          {message.replyTo && (
            <div
              className={`border-l-2 pl-2 mb-2 opacity-80 ${
                isOwn ? "border-black/50" : "border-white/50"
              }`}
            >
              <p className="text-xs font-medium">
                Replying to {message.replyTo.senderName}
              </p>
              <p className="text-xs truncate italic">
                {message.replyTo.content}
              </p>
            </div>
          )}

          {/* Message content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Timestamp */}
          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
            isOwn ? "text-zinc-600" : "text-zinc-400"
          }`}>
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && (
              <CheckCheck
                className={`size-3 ${
                  // Assuming 'isRead' property exists or defaulting to gray if not available in this context yet
                  // If ChatMessage props don't have isRead, we might need to update the interface.
                  // For now, I'll check if message has isRead property, otherwise default to gray.
                  (message as any).isRead ? "text-sky-500" : "text-zinc-400"
                }`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-black"
          onClick={() => onReply(message)}
          title="Reply"
        >
          <Reply size={16} />
        </Button>
        
        {(isOwn || isAdmin) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600"
            onClick={() => onDelete && onDelete(message._id)}
            title="Unsend"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
