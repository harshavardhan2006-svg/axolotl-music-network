import Topbar from "@/components/Topbar";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";
import UsersList from "./components/UsersList";
import ChatHeader from "./components/ChatHeader";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, CheckCheck } from "lucide-react";
import MessageInput from "./components/MessageInput";

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const ChatPage = () => {
  const { user } = useUser();
  const {
    messages,
    selectedUser,
    fetchUsers,
    fetchMessages,
    setReplyTo,
    unsendMessage,
  } = useChatStore();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser.clerkId);
  }, [selectedUser, fetchMessages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      // Auto scroll to bottom when new messages arrive
      setTimeout(() => {
        scrollAreaRef.current!.scrollTop = scrollAreaRef.current!.scrollHeight;
      }, 100);
    }
  }, [messages]);

  console.log({ messages });

  return (
    <main className="h-full rounded-3xl glass flex flex-col overflow-hidden">
      <Topbar />

      <div className="grid lg:grid-cols-[320px_1fr] md:grid-cols-[120px_1fr] grid-cols-[80px_1fr] flex-1 overflow-hidden">
        <UsersList />

        {/* chat message */}
        <div className="flex flex-col h-full overflow-hidden">
          {selectedUser ? (
            <>
              <ChatHeader />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex items-start gap-3 ${
                        message.senderId === user?.id ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Avatar className="size-8 flex-shrink-0">
                        <AvatarImage
                          src={
                            message.senderId === user?.id
                              ? user.imageUrl
                              : selectedUser.imageUrl
                          }
                        />
                      </Avatar>

                      <div className={`flex items-end gap-2 group ${
                        message.senderId === user?.id ? "flex-row-reverse" : ""
                      }`}>
                        <div
                          className={`rounded-lg p-3 max-w-[300px] break-words shadow-sm relative ${
                            message.senderId === user?.id
                              ? "bg-zinc-800 text-white"
                              : "bg-black/60 backdrop-blur-md border border-white/10 text-white"
                          }`}
                        >
                          {message.replyTo && (
                            <div className={`border-l-2 pl-2 mb-2 opacity-70 ${
                              message.senderId === user?.id ? "border-black/50" : "border-white/50"
                            }`}>
                              <p className="text-xs font-medium">
                                Replying to{" "}
                                {message.replyTo.senderId === user?.id
                                  ? "yourself"
                                  : "them"}
                              </p>
                              <p className="text-xs italic truncate">
                                {message.replyTo.content}
                              </p>
                            </div>
                          )}
                          <p className="text-base whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          <div className={`flex items-center justify-end mt-1 gap-1 text-[10px] ${
                            message.senderId === user?.id ? "text-zinc-600" : "text-zinc-400"
                          }`}>
                            <span>
                              {formatTime(message.createdAt)}
                            </span>
                            {message.senderId === user?.id && (
                              <CheckCheck
                                className={`size-3 ${
                                  message.isRead ? "text-sky-500" : "text-zinc-400"
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Inline Message Options */}
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                          message.senderId === user?.id ? "flex-row-reverse" : ""
                        }`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-black"
                            onClick={() => setReplyTo(message)}
                            title="Reply"
                          >
                            <MessageSquare className="size-4" />
                          </Button>
                          
                          {message.senderId === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600"
                              onClick={() => unsendMessage(message._id)}
                              title="Unsend"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <MessageInput />
            </>
          ) : (
            <NoConversationPlaceholder />
          )}
        </div>
      </div>
    </main>
  );
};
export default ChatPage;

const NoConversationPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-6">
    <img src="/spotify.png" alt="Spotify" className="size-16 animate-bounce" />
    <div className="text-center">
      <h3 className="text-zinc-300 text-lg font-medium mb-1">
        No conversation selected
      </h3>
      <p className="text-zinc-500 text-sm">Choose a friend to start chatting</p>
    </div>
  </div>
);
