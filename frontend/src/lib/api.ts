import { axiosInstance } from "./axios";

// Hall API functions
export const hallApi = {
  // Get user's halls
  getMyHalls: () => axiosInstance.get("/halls/my-halls"),
  
  // Get single hall
  getHall: (hallId: string) => axiosInstance.get(`/halls/${hallId}`),
  
  // Create hall
  createHall: (data: FormData | { name: string; description: string; type: string; coverImage?: string }) => {
    return axiosInstance.post("/halls", data);
  },
  
  // Update hall
  updateHall: (hallId: string, data: any) => axiosInstance.put(`/halls/${hallId}`, data),
  
  // Delete hall
  deleteHall: (hallId: string) => axiosInstance.delete(`/halls/${hallId}`),
  
  // Join hall
  joinHall: (hallId: string) => axiosInstance.post(`/halls/${hallId}/join`),
  
  // Leave hall
  leaveHall: (hallId: string) => axiosInstance.post(`/halls/${hallId}/leave`),
  
  // Discover public halls
  discoverHalls: (search?: string) => axiosInstance.get(`/halls/discover?search=${search || ''}`),
};

// Hall Chat API functions
export const hallChatApi = {
  // Get messages
  getMessages: (hallId: string, page = 1, limit = 50) =>
    axiosInstance.get(`/hall-chat/${hallId}/messages?page=${page}&limit=${limit}`),
  
  // Send message
  sendMessage: (hallId: string, data: { content: string; replyToId?: string }) =>
    axiosInstance.post(`/hall-chat/${hallId}/messages`, data),
  
  // Delete message
  deleteMessage: (hallId: string, messageId: string) =>
    axiosInstance.delete(`/hall-chat/${hallId}/messages/${messageId}`),
};

// Hall Music API functions
export const hallMusicApi = {
  // Play song
  playSong: (hallId: string, data: { songId: string; position?: number }) =>
    axiosInstance.post(`/hall-music/${hallId}/play`, data),
  
  // Toggle playback
  togglePlayback: (hallId: string) => axiosInstance.post(`/hall-music/${hallId}/toggle`),
  
  // Seek
  seek: (hallId: string, data: { position: number }) =>
    axiosInstance.post(`/hall-music/${hallId}/seek`, data),
  
  // Skip to next
  skipToNext: (hallId: string) => axiosInstance.post(`/hall-music/${hallId}/next`),
  
  // Add to queue
  addToQueue: (hallId: string, data: { songId: string }) =>
    axiosInstance.post(`/hall-music/${hallId}/queue`, data),
  
  // Remove from queue
  removeFromQueue: (hallId: string, queueIndex: number) =>
    axiosInstance.delete(`/hall-music/${hallId}/queue/${queueIndex}`),
};