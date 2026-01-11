
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMusicStore } from "@/stores/useMusicStore";
import { useChatStore } from "@/stores/useChatStore";
import { SignedIn } from "@clerk/clerk-react";
import { HomeIcon, Library, MessageCircle, Search, Bell, Building2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const LeftSidebar = () => {
  const { albums, fetchAlbums, isLoading } = useMusicStore();
  const { unreadNotificationsCount } = useChatStore();

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  console.log({ albums });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Navigation Dock */}
      <div className="rounded-3xl glass p-2 flex flex-col gap-4 transition-all duration-500">
        <Link
          to={"/"}
          className={cn(
            buttonVariants({
              variant: "ghost",
              className: "w-full justify-start text-white hover:bg-cyan-500/20 hover:text-cyan-400 transition-all rounded-full h-12 px-3",
            })
          )}
        >
          <HomeIcon className="size-6 min-w-6" />
          <span className="ml-4 font-medium hidden group-hover:inline-block whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Home</span>
        </Link>

        <SignedIn>
          <Link
            to={"/chat"}
            className={cn(
              buttonVariants({
                variant: "ghost",
                className: "w-full justify-start text-white hover:bg-cyan-500/20 hover:text-cyan-400 transition-all rounded-full h-12 px-3",
              })
            )}
          >
            <MessageCircle className="size-6 min-w-6" />
            <span className="ml-4 font-medium hidden group-hover:inline-block whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Messages</span>
          </Link>

          <Link
            to={"/halls"}
            className={cn(
              buttonVariants({
                variant: "ghost",
                className: "w-full justify-start text-white hover:bg-cyan-500/20 hover:text-cyan-400 transition-all rounded-full h-12 px-3",
              })
            )}
          >
            <Building2 className="size-6 min-w-6" />
            <span className="ml-4 font-medium hidden group-hover:inline-block whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Halls</span>
          </Link>

          <Link
            to={"/notifications"}
            className={cn(
              buttonVariants({
                variant: "ghost",
                className: "w-full justify-start text-white hover:bg-cyan-500/20 hover:text-cyan-400 transition-all rounded-full h-12 px-3 relative",
              })
            )}
          >
            <Bell className="size-6 min-w-6" />
            <span className="ml-4 font-medium hidden group-hover:inline-block whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Notifications</span>
            {unreadNotificationsCount > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
            )}
          </Link>
        </SignedIn>

        <Link
          to={"/search"}
          className={cn(
            buttonVariants({
              variant: "ghost",
              className: "w-full justify-start text-white hover:bg-cyan-500/20 hover:text-cyan-400 transition-all rounded-full h-12 px-3",
            })
          )}
        >
          <Search className="size-6 min-w-6" />
          <span className="ml-4 font-medium hidden group-hover:inline-block whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Search</span>
        </Link>
      </div>

      {/* Library Icons (Simplified) */}
      <div className="flex-1 rounded-3xl glass p-2 flex flex-col gap-2 overflow-hidden transition-all duration-500">
        <div className="p-2 text-zinc-400 flex items-center justify-center group-hover:justify-start transition-all">
            <Library className="size-5 min-w-5" />
            <span className="ml-4 font-medium hidden group-hover:inline-block whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Library</span>
        </div>
        
        <ScrollArea className="flex-1 w-full px-1">
          <div className="flex flex-col gap-3 pb-4">
            {isLoading ? (
               <div className="size-10 rounded-full bg-white/5 animate-pulse mx-auto" />
            ) : (
              albums.map((album) => (
                <Link
                  to={`/albums/${album._id}`}
                  key={album._id}
                  className="group/item relative flex items-center p-2 hover:bg-white/5 rounded-xl transition-colors"
                  title={album.title}
                >
                  <img
                    src={album.imageUrl}
                    alt={album.title}
                    className="size-10 rounded-full object-cover shadow-md border border-white/5 group-hover/item:border-cyan-500/50 transition-all flex-shrink-0"
                  />
                  <div className="ml-3 hidden group-hover:block overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{album.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{album.artist}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
export default LeftSidebar;
