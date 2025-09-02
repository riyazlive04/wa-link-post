
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Sparkles, Upload, X, AlertCircle } from 'lucide-react';
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
      console.log('File selected via input:', {
        name: file.name,
        type: file.type,
        size: Math.round(file.size / 1024) + ' KB'
      });
      onImageSelect(file);
    }
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      console.log('File dropped:', {
        name: file.name,
        type: file.type,
        size: Math.round(file.size / 1024) + ' KB'
      });
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
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="image-upload"
                accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploading}
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor="image-upload"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 text-sm"
                  >
                    {isUploading ? 'Uploading...' : 'Select Image'}
                  </Label>
                  {selectedImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearImage}
                      className="ml-2 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Or drag and drop an image here
                </p>
              </div>
            </div>

            {selectedImage && (
              <div className="space-y-2">
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  <Upload className="h-3 w-3" />
                  Manual Upload
                </Badge>
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>{selectedImage.name}</span>
                  </div>
                  <div className="text-xs mt-1">
                    Size: {Math.round(selectedImage.size / 1024)} KB | Type: {selectedImage.type || 'Unknown'}
                  </div>
                </div>
              </div>
            )}

            {uploadedImageUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Image uploaded successfully!
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Uploaded image preview" 
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      console.error('Failed to load uploaded image preview:', uploadedImageUrl);
                      e.currentTarget.style.display = 'none';
                      // Show error message
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'flex items-center justify-center h-32 bg-muted text-muted-foreground';
                      errorDiv.innerHTML = '<div class="flex items-center gap-2"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>Failed to load preview</div>';
                      e.currentTarget.parentNode?.appendChild(errorDiv);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                <span>Supported formats: JPG, JPEG, PNG, WebP (max 10MB)</span>
              </div>
              <div className="pl-5">
                <span>Files are uploaded to secure cloud storage</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
