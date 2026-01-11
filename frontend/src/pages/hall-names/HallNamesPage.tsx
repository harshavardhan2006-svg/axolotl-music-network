import { useEffect, useState } from "react";
import { useHallStore } from "@/stores/useHallStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Users, Music, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import CreateHallDialog from "./components/CreateHallDialog";

const HallsPage = () => {
  const {
    myHalls,
    joinedHalls,
    discoverHalls,
    fetchMyHalls,
    fetchDiscoverHalls,
    joinHall,
    isLoading,
  } = useHallStore();

  const { user } = useAuthStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("my-halls");

  useEffect(() => {
    if (activeTab === "my-halls" || activeTab === "joined") {
      fetchMyHalls();
    }
  }, [activeTab, fetchMyHalls]);

  useEffect(() => {
    if (activeTab === "discover") {
      const timeoutId = setTimeout(() => {
        fetchDiscoverHalls(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, activeTab, fetchDiscoverHalls]);

  const filteredMyHalls = myHalls.filter(
    (hall) =>
      hall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hall.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJoinedHalls = joinedHalls.filter(
    (hall) =>
      hall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hall.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const HallCard = ({
    hall,
    isOwner = false,
    showJoinButton = false,
  }: {
    hall: any;
    isOwner?: boolean;
    showJoinButton?: boolean;
  }) => {
    const isMember =
      hall.members?.some(
        (member: any) =>
          member.userId === (user as any)?.id ||
          member._id === (user as any)?.id
      ) || isOwner;

    return (
      <Card className="bg-zinc-800 hover:bg-zinc-700 transition-all duration-200 cursor-pointer group border-zinc-700 h-full">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Header with image and basic info */}
            <div className="flex items-start gap-4">
              <img
                src={hall.coverImage || "/albums/album1.jpg"}
                alt={hall.name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0 shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = "/albums/album1.jpg";
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-white text-lg truncate">
                    {hall.name}
                  </h3>
                  {isOwner && (
                    <Crown
                      size={18}
                      className="text-yellow-500 flex-shrink-0"
                    />
                  )}
                </div>

                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    hall.type === "public"
                      ? "bg-green-900/50 text-green-300 border border-green-700"
                      : "bg-blue-900/50 text-blue-300 border border-blue-700"
                  }`}
                >
                  {hall.type.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Description */}
            {hall.description && (
              <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {hall.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>
                  {hall.memberCount || hall.members?.length || 0} members
                </span>
              </div>

              {hall.currentSong && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Music size={16} className="text-green-400" />
                  <span className="truncate">
                    {hall.currentSong.title} - {hall.currentSong.artist}
                  </span>
                </div>
              )}
            </div>

            {/* Admin info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={
                    hall.adminId?.imageUrl ||
                    hall.adminId?.avatar ||
                    "/default-avatar.png"
                  }
                  alt={hall.adminId?.fullName || hall.adminId?.name || "Admin"}
                  className="w-6 h-6 rounded-full border border-zinc-600"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <span className="text-sm text-zinc-400">
                  {hall.adminId?.fullName || hall.adminId?.name || "Admin"}
                </span>
              </div>

              {/* Action Button */}
              <div className="flex gap-2">
                {showJoinButton && !isMember ? (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      joinHall(hall._id);
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    Join Hall
                  </Button>
                ) : (
                  <Link to={`/halls/${hall._id}`}>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                    >
                      {isMember ? "Enter Hall" : "View Hall"}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <Music size={32} className="text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 mb-4 max-w-md">{description}</p>
      {action}
    </div>
  );

  const SkeletonCard = () => (
    <Card className="bg-zinc-800 border-zinc-700 animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-zinc-700 rounded-lg flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
            </div>
            <div className="h-3 bg-zinc-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-zinc-700 rounded w-2/3 mb-3"></div>
            <div className="flex items-center gap-4">
              <div className="h-3 bg-zinc-700 rounded w-16"></div>
              <div className="h-3 bg-zinc-700 rounded w-20"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading && myHalls.length === 0 && joinedHalls.length === 0) {
    return (
      <div className="h-full bg-gradient-to-b from-zinc-800 to-zinc-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-zinc-700 rounded w-48 mb-2"></div>
              <div className="h-4 bg-zinc-700 rounded w-64"></div>
            </div>
            <div className="h-10 bg-zinc-700 rounded w-32"></div>
          </div>

          {/* Search Skeleton */}
          <div className="h-10 bg-zinc-700 rounded mb-6"></div>

          {/* Tabs Skeleton */}
          <div className="h-10 bg-zinc-700 rounded mb-6"></div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full glass p-6 overflow-y-auto rounded-3xl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🎵 My Halls</h1>
            <p className="text-zinc-400">
              Create and join music listening rooms
            </p>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-green-600 hover:bg-green-500 text-white sm:w-auto w-full"
          >
            <Plus size={20} className="mr-2" />
            Create Hall
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
          />
          <Input
            placeholder="Search halls by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-800 border border-zinc-700">
            <TabsTrigger
              value="my-halls"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              My Halls ({myHalls.length})
            </TabsTrigger>
            <TabsTrigger
              value="joined"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              Joined ({joinedHalls.length})
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
            >
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-halls" className="mt-6">
            {filteredMyHalls.length === 0 ? (
              <EmptyState
                title="No halls created yet"
                description="Create your first hall to start listening with friends and share music together"
                action={
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    <Plus size={20} className="mr-2" />
                    Create Your First Hall
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMyHalls.map((hall) => (
                  <HallCard key={hall._id} hall={hall} isOwner={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="joined" className="mt-6">
            {filteredJoinedHalls.length === 0 ? (
              <EmptyState
                title="No halls joined yet"
                description="Discover and join halls to listen to music with other community members"
                action={
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("discover")}
                    className="border-zinc-600 text-white hover:bg-zinc-700"
                  >
                    Discover Halls
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredJoinedHalls.map((hall) => (
                  <HallCard key={hall._id} hall={hall} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : discoverHalls.length === 0 ? (
              <EmptyState
                title={
                  searchQuery ? "No halls found" : "No public halls available"
                }
                description={
                  searchQuery
                    ? "Try searching with different keywords"
                    : "Be the first to create a public hall!"
                }
                action={
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    Create Public Hall
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {discoverHalls.map((hall) => (
                  <HallCard key={hall._id} hall={hall} showJoinButton={true} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateHallDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
};

export default HallsPage;
