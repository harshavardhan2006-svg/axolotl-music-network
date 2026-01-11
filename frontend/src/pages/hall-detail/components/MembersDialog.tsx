import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Crown, MessageCircle, UserX, Users } from "lucide-react";

interface MembersDialogProps {
  open: boolean;
  onClose: () => void;
  hall: {
    _id: string;
    members: Array<{
      _id: string;
      name: string;
      avatar?: string;
      isOnline: boolean;
      lastSeen?: string;
    }>;
    adminId: string;
  };
  isAdmin: boolean;
}

const MembersDialog = ({
  open,
  onClose,
  hall,
  isAdmin,
}: MembersDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = (hall.members || []).filter((member) =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineMembers = filteredMembers.filter((member) => member.isOnline);
  const offlineMembers = filteredMembers.filter((member) => !member.isOnline);

  const handleKickMember = async (memberId: string) => {
    if (window.confirm("Are you sure you want to kick this member?")) {
      // TODO: Implement kick member API call
      console.log("Kicking member:", memberId);
    }
  };

  const handleMessageMember = (memberId: string) => {
    // TODO: Navigate to DM chat
    console.log("Message member:", memberId);
    onClose();
  };

  const MemberCard = ({ member }: { member: any }) => (
    <div className="flex items-center justify-between p-3 hover:bg-zinc-800 rounded-lg transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <img
            src={member.imageUrl || member.avatar || "/default-avatar.png"}
            alt={member.fullName || member.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-zinc-600"
          />
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${
              member.isOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium truncate">
              {member.fullName || member.name || "Unknown User"}
            </span>
            {member._id === hall.adminId && (
              <Crown size={16} className="text-yellow-500 flex-shrink-0" />
            )}
          </div>
          {member.isOnline ? (
            <p className="text-xs text-green-400 font-medium">Online now</p>
          ) : member.lastSeen ? (
            <p className="text-xs text-zinc-400">
              Last seen {new Date(member.lastSeen).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Offline</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleMessageMember(member._id)}
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 p-2"
          title="Send message"
        >
          <MessageCircle size={16} />
        </Button>

        {isAdmin && member._id !== hall.adminId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleKickMember(member._id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2"
            title="Remove member"
          >
            <UserX size={16} />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg w-full max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-white text-xl">
            Members ({hall.members.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4 flex-1 min-h-0">
          {/* Search */}
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
          />

          {/* Members List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 min-h-0">
            {/* Online Members */}
            {onlineMembers.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-green-400 mb-3 px-1 sticky top-0 bg-zinc-900 py-1">
                  🟢 ONLINE ({onlineMembers.length})
                </h3>
                <div className="space-y-1">
                  {onlineMembers.map((member) => (
                    <MemberCard key={member._id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-3 px-1 sticky top-0 bg-zinc-900 py-1">
                  ⚫ OFFLINE ({offlineMembers.length})
                </h3>
                <div className="space-y-1">
                  {offlineMembers.map((member) => (
                    <MemberCard key={member._id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {filteredMembers.length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                <Users size={48} className="mx-auto mb-4 text-zinc-600" />
                <p className="text-lg">No members found</p>
                <p className="text-sm">Try adjusting your search</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembersDialog;
