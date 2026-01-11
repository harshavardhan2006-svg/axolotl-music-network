import { create } from 'zustand';
import { hallChatApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  messageType: 'text' | 'system';
}

interface HallChatStore {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  typingUsers: string[];
  fetchMessages: (hallId: string, page?: number) => Promise<void>;
  sendMessage: (hallId: string, content: string, replyToId?: string) => Promise<void>;
  deleteMessage: (hallId: string, messageId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setTyping: (isTyping: boolean, users?: string[]) => void;
  clearMessages: () => void;
  removeMessage: (messageId: string) => void;
}

export const useHallChatStore = create<HallChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  isTyping: false,
  typingUsers: [],

  fetchMessages: async (hallId: string, page: number = 1) => {
    set({ isLoading: true });
    try {
      const response = await hallChatApi.getMessages(hallId, page);
      const newMessages = response.data;
      
      if (page === 1) {
        // First page - replace all messages
        set({ messages: newMessages, isLoading: false });
      } else {
        // Additional pages - prepend to existing messages
        const { messages } = get();
        set({ messages: [...newMessages, ...messages], isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch messages';
      toast.error(errorMessage);
      set({ isLoading: false });
    }
  },

  sendMessage: async (hallId: string, content: string, replyToId?: string) => {
    try {
      const response = await hallChatApi.sendMessage(hallId, { content, replyToId });
      // Message will be added via socket event, but add it locally for immediate feedback
      const { messages } = get();
      const newMessage = response.data;
      
      // Check if message already exists (from socket)
      const messageExists = messages.some(msg => msg._id === newMessage._id);
      if (!messageExists) {
        set({ messages: [...messages, newMessage] });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  },

  deleteMessage: async (hallId: string, messageId: string) => {
    try {
      await hallChatApi.deleteMessage(hallId, messageId);
      const { messages } = get();
      set({ messages: messages.filter(msg => msg._id !== messageId) });
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  },

  addMessage: (message: Message) => {
    const { messages } = get();
    // Check if message already exists to avoid duplicates
    const messageExists = messages.some(msg => msg._id === message._id);
    if (!messageExists) {
      set({ messages: [...messages, message] });
    }
  },

  setTyping: (isTyping: boolean, users: string[] = []) => {
    set({ isTyping, typingUsers: users });
  },

  clearMessages: () => {
    set({ messages: [], isTyping: false, typingUsers: [] });
  },
  
  removeMessage: (messageId: string) => {
    const { messages } = get();
    set({ messages: messages.filter(msg => msg._id !== messageId) });
  },
}));