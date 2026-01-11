import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import MainLayout from "./layout/MainLayout";
import ChatPage from "./pages/chat/ChatPage";
import AlbumPage from "./pages/album/AlbumPage";
import AdminPage from "./pages/admin/AdminPage";
import ProfilePage from "./pages/profile/ProfilePage";
import SearchPage from "./pages/search/SearchPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import HallsPage from "./pages/hall-names/HallNamesPage";
import HallDetailPage from "./pages/hall-detail/HallDetailPage";
import AudioPlayer from "./layout/components/AudioPlayer";
import ErrorBoundary from "./components/ErrorBoundary";
import DemoMode from "./components/DemoMode";
import { axiosInstance } from "./lib/axios";

import { Toaster } from "react-hot-toast";
import NotFoundPage from "./pages/404/NotFoundPage";

// Initialize audio context manager
import "./lib/audioContext";
import { useChatStore } from "./stores/useChatStore";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

function App() {
  const { user } = useUser();
  const { fetchFollowRequests } = useChatStore();
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      fetchFollowRequests();
    }
  }, [user, fetchFollowRequests]);

  // Check if backend is available
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await axiosInstance.get('/health', { timeout: 5000 });
        setBackendAvailable(true);
      } catch (error) {
        console.log('Backend not available, showing demo mode');
        setBackendAvailable(false);
      }
    };
    checkBackend();
  }, []);

  // Show loading while checking backend
  if (backendAvailable === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show demo mode if backend is not available
  if (!backendAvailable) {
    return <DemoMode />;
  }

  return (
    <ErrorBoundary>
      <AudioPlayer />
      <Routes>
        <Route
          path="/sso-callback"
          element={
            <AuthenticateWithRedirectCallback
              signUpForceRedirectUrl={"/auth-callback"}
            />
          }
        />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/halls" element={
            <ErrorBoundary>
              <HallsPage />
            </ErrorBoundary>
          } />
          <Route path="/halls/:hallId" element={
            <ErrorBoundary>
              <HallDetailPage />
            </ErrorBoundary>
          } />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/albums/:albumId" element={<AlbumPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
