import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useHallStore } from "@/stores/useHallStore";
import { Upload, X } from "lucide-react";

interface CreateHallDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateHallDialog = ({ open, onClose }: CreateHallDialogProps) => {
  const { createHall } = useHallStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      // Sanitize inputs
      const sanitizedName = name.trim().slice(0, 100);
      const sanitizedDescription = description.trim().slice(0, 500);
      
      if (sanitizedName.length < 1) {
        throw new Error('Hall name is required');
      }

      // Validate file if provided
      if (selectedFile) {
        if (!selectedFile.type.startsWith('image/')) {
          throw new Error('Please select a valid image file');
        }
        if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('Image file too large (max 5MB)');
        }
      }

      const hallData = {
        name: sanitizedName,
        description: sanitizedDescription,
        type,
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append("name", hallData.name);
        formData.append("description", hallData.description);
        formData.append("type", hallData.type);
        formData.append("coverImage", selectedFile);
        await createHall(formData);
      } else {
        await createHall(hallData);
      }

      setName("");
      setDescription("");
      setType("public");
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (error: any) {
      console.error("Error creating hall:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">🎵 Create New Hall</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a new music hall where you can share and listen to music
            together with others.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">
              Hall Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Enter hall name"
              required
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              placeholder="Enter description"
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <Label className="text-white">Cover Image</Label>
            <div className="mt-2">
              {previewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Cover preview"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-zinc-600"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 p-0"
                  >
                    <X size={10} />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-zinc-600 rounded-lg p-4 text-center">
                  <Upload size={20} className="mx-auto text-zinc-500 mb-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-zinc-600 text-white hover:bg-zinc-700"
                  >
                    Choose Image
                  </Button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <Label className="text-white">Hall Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(value: "public" | "private") => setType(value)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="text-white">
                  Public
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="text-white">
                  Private
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-zinc-400 mt-1">
              Private halls are only visible to your followers and following
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-600 text-white hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHallDialog;
