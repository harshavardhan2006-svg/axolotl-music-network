import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, Upload } from 'lucide-react';
import { useHallStore } from '@/stores/useHallStore';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  hall: {
    _id: string;
    name: string;
    description: string;
    coverImage: string;
    type: 'public' | 'private';
  };
}

const SettingsDialog = ({ open, onClose, hall }: SettingsDialogProps) => {
  const { updateHall, deleteHall } = useHallStore();
  const [name, setName] = useState(hall.name);
  const [description, setDescription] = useState(hall.description);
  const [type, setType] = useState(hall.type);
  const [coverImage, setCoverImage] = useState(hall.coverImage);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName(hall.name);
      setDescription(hall.description);
      setType(hall.type);
      setCoverImage(hall.coverImage);
      setImageFile(null);
    }
  }, [open, hall]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (coverImage && coverImage.startsWith('blob:')) {
        URL.revokeObjectURL(coverImage);
      }
    };
  }, [coverImage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (imageFile) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('description', description.trim());
        formData.append('type', type);
        formData.append('coverImage', imageFile);
        await updateHall(hall._id, formData);
      } else {
        // Regular JSON update
        await updateHall(hall._id, { name, description, type });
      }
      onClose();
    } catch (error) {
      console.error('Error updating hall:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setCoverImage(previewUrl);
    }
  };

  const handleDeleteHall = async () => {
    if (window.confirm('Are you sure you want to delete this hall? This will remove all members and delete all messages. This action cannot be undone.')) {
      try {
        await deleteHall(hall._id);
        onClose();
      } catch (error) {
        console.error('Error deleting hall:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Hall Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Hall Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Hall Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                required
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-white">Cover Image</Label>
              <div className="flex items-center gap-4">
                <img
                  src={coverImage || '/albums/album1.jpg'}
                  alt="Hall cover"
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== '/albums/album1.jpg') {
                      e.currentTarget.src = '/albums/album1.jpg';
                    }
                  }}
                />
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="cover-upload"
                  />
                  <Label
                    htmlFor="cover-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm"
                  >
                    <Upload size={16} />
                    Change Image
                  </Label>
                </div>
              </div>
            </div>

            {/* Hall Type */}
            <div className="space-y-3">
              <Label className="text-white">Hall Type</Label>
              <RadioGroup value={type} onValueChange={(value: 'public' | 'private') => setType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="text-white">Public</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="text-white">Private</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-zinc-400">
                Private halls are only visible to your followers and following
              </p>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-zinc-700 pt-6">
              <h3 className="text-red-400 font-medium mb-3">⚠️ Danger Zone</h3>
              <Button
                type="button"
                onClick={handleDeleteHall}
                className="w-full bg-red-600 hover:bg-red-500 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Hall
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-zinc-600 text-white hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;