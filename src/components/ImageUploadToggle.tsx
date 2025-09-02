
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadToggleProps {
  useManualImage: boolean;
  onToggleChange: (enabled: boolean) => void;
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  uploadedImageUrl: string;
  isUploading: boolean;
  onClearImage: () => void;
}

export const ImageUploadToggle = ({
  useManualImage,
  onToggleChange,
  onImageSelect,
  selectedImage,
  uploadedImageUrl,
  isUploading,
  onClearImage
}: ImageUploadToggleProps) => {
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Image Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="manual-image-toggle" className="text-sm font-medium">
              Use manual image upload
            </Label>
            <p className="text-xs text-muted-foreground">
              Toggle off to use AI-generated images based on your content
            </p>
          </div>
          <Switch
            id="manual-image-toggle"
            checked={useManualImage}
            onCheckedChange={onToggleChange}
          />
        </div>

        {!useManualImage && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </Badge>
            <span className="text-sm text-muted-foreground">
              Images will be generated automatically based on your content
            </span>
          </div>
        )}

        {useManualImage && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="image-upload"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploading}
              />
              <Label
                htmlFor="image-upload"
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 text-sm"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Select Image'}
              </Label>
              {selectedImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearImage}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {selectedImage && (
              <div className="space-y-2">
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  <Upload className="h-3 w-3" />
                  Manual Upload
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                </p>
              </div>
            )}

            {uploadedImageUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">Image uploaded successfully!</p>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Uploaded image preview" 
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      console.error('Failed to load uploaded image preview');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, WebP (max 10MB)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
